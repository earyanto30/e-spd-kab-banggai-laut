import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import GovButton from './GovButton.vue';
import GovInputText from './GovInputText.vue';
import GovMessage from './GovMessage.vue';
import GovTextarea from './GovTextarea.vue';

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
  });
});
