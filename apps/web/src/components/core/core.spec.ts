import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import {
  GovButton,
  GovInputText,
  GovMessage,
  GovTextarea,
  GovCard,
  GovCheckbox,
  GovInputNumber,
  GovSelect,
  GovPassword,
  GovDatePicker,
  GovMultiSelect,
  GovSelectButton,
  GovTable,
} from './index';

const stubs = {
  Button: { template: '<button :disabled="loading || disabled"><slot /></button>', props: ['loading', 'disabled'] },
  InputText: {
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue'],
    emits: ['update:modelValue'],
  },
  Textarea: {
    template: '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)"></textarea>',
    props: ['modelValue'],
    emits: ['update:modelValue'],
  },
  Message: { template: '<div><slot /></div>', props: ['severity', 'closable'] },
  Card: {
    template: `
      <div class="card">
        <div v-if="$slots.header" class="header"><slot name="header" /></div>
        <div v-if="$slots.title" class="title"><slot name="title" /></div>
        <div v-if="$slots.content" class="content"><slot name="content" /></div>
      </div>
    `,
  },
  Checkbox: {
    template: '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
    props: ['modelValue', 'binary', 'disabled', 'inputId'],
    emits: ['update:modelValue'],
  },
  InputNumber: {
    template: '<input type="number" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
    props: ['modelValue'],
    emits: ['update:modelValue'],
  },
  Select: {
    template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="opt in options" :key="opt" :value="opt">{{ opt }}</option></select>',
    props: ['modelValue', 'options'],
    emits: ['update:modelValue'],
  },
  Password: {
    template: '<input type="password" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'feedback', 'toggleMask', 'disabled'],
    emits: ['update:modelValue'],
  },
  DatePicker: {
    template: '<input type="date" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'dateFormat', 'showIcon'],
    emits: ['update:modelValue'],
  },
  MultiSelect: {
    template: '<select multiple :value="modelValue" @change="$emit(\'update:modelValue\', [$event.target.value])"><option v-for="opt in options" :key="opt" :value="opt">{{ opt }}</option></select>',
    props: ['modelValue', 'options'],
    emits: ['update:modelValue'],
  },
  SelectButton: {
    template: '<button @click="$emit(\'update:modelValue\', options ? options[0] : \'A\')">SelectButton</button>',
    props: ['modelValue', 'options'],
    emits: ['update:modelValue'],
  },
  DataTable: {
    template: '<div class="datatable"><slot /></div>',
    props: ['value'],
  },
};

describe('core components', () => {
  it('renders button state and message content', () => {
    expect(mount(GovButton, { props: { label: 'Save', loading: true }, global: { stubs } }).find('button').attributes('disabled')).toBeDefined();
    expect(mount(GovMessage, { props: { severity: 'success' }, slots: { default: 'Done' }, global: { stubs } }).text()).toBe('Done');
  });

  it('supports v-model on input components', async () => {
    const input = mount(GovInputText, { props: { modelValue: 'old' }, global: { stubs } });
    await input.find('input').setValue('new');
    expect(input.emitted('update:modelValue')?.[0]).toEqual(['new']);

    const textarea = mount(GovTextarea, { props: { modelValue: 'old' }, global: { stubs } });
    await textarea.find('textarea').setValue('new');
    expect(textarea.emitted('update:modelValue')?.[0]).toEqual(['new']);

    const checkbox = mount(GovCheckbox, { props: { modelValue: false, label: 'Agree' }, global: { stubs } });
    await checkbox.find('input').setValue(true);
    expect(checkbox.emitted('update:modelValue')?.[0]).toEqual([true]);

    const inputNumber = mount(GovInputNumber, { props: { modelValue: 5 }, global: { stubs } });
    await inputNumber.find('input').setValue(10);
    expect(inputNumber.emitted('update:modelValue')?.[0]).toEqual([10]);

    const select = mount(GovSelect, { props: { modelValue: 'A', options: ['A', 'B'] }, global: { stubs } });
    await select.find('select').setValue('B');
    expect(select.emitted('update:modelValue')?.[0]).toEqual(['B']);

    const password = mount(GovPassword, { props: { modelValue: 'secret' }, global: { stubs } });
    await password.find('input').setValue('newsecret');
    expect(password.emitted('update:modelValue')?.[0]).toEqual(['newsecret']);

    const datePicker = mount(GovDatePicker, { props: { modelValue: null }, global: { stubs } });
    await datePicker.find('input').setValue('2026-05-01');
    expect(datePicker.emitted('update:modelValue')?.[0]).toEqual(['2026-05-01']);

    const multiSelect = mount(GovMultiSelect, { props: { modelValue: [], options: ['Opt1', 'Opt2'] }, global: { stubs } });
    await multiSelect.find('select').setValue('Opt1');
    expect(multiSelect.emitted('update:modelValue')?.[0]).toEqual([['Opt1']]);

    const selectButton = mount(GovSelectButton, { props: { modelValue: 'A', options: ['A', 'B'] }, global: { stubs } });
    await selectButton.findComponent(stubs.SelectButton).vm.$emit('update:modelValue', 'B');
    expect(selectButton.emitted('update:modelValue')?.[0]).toEqual(['B']);

    const table = mount(GovTable, { props: { value: [{ id: 1 }] }, slots: { default: 'Table Content' }, global: { stubs } });
    expect(table.text()).toContain('Table Content');
  });

  it('renders GovCard with header and title slots', () => {
    const card = mount(GovCard, {
      slots: {
        header: 'Card Header',
        title: 'Card Title',
        default: 'Card Body Content',
      },
      global: { stubs },
    });

    expect(card.text()).toContain('Card Header');
    expect(card.text()).toContain('Card Title');
    expect(card.text()).toContain('Card Body Content');
  });
});
