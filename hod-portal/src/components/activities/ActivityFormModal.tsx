/**
 * ActivityFormModal — generic form driven by a `fields` descriptor array.
 * Uses react-hook-form Controller API (required for React Native TextInput).
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal as RNModal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useForm, Controller, Control, FieldErrors, RegisterOptions } from 'react-hook-form';
import { X, ChevronDown, Check } from '../../components/icons';
import Button from '../ui/Button';
import { colors, shadows, primaryScale, neutral } from '../../theme/colors';

export type FieldType = 'text' | 'number' | 'email' | 'multiline' | 'select' | 'date';

export interface FieldOption {
  label: string;
  value: string | number;
}

export interface FieldDescriptor {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  type?: FieldType;
  options?: FieldOption[];
  validation?: RegisterOptions;
}

// ─── Field renderers ──────────────────────────────────────────────────────────

interface FieldLabelProps {
  label: string;
  required?: boolean;
}

function FieldLabel({ label, required }: FieldLabelProps) {
  return (
    <Text style={fs.label}>
      {label}
      {required && <Text style={{ color: colors.red[500] }}> *</Text>}
    </Text>
  );
}

interface TextFieldProps {
  field: FieldDescriptor;
  control: Control<any>;
  errors: FieldErrors<any>;
  type?: FieldType;
}

function TextField({ field, control, errors, type }: TextFieldProps) {
  const isMultiline = type === 'multiline';
  const isNumber = type === 'number';
  const isEmail = type === 'email';

  return (
    <Controller
      control={control}
      name={field.name}
      rules={field.validation ?? (field.required ? { required: `${field.label} is required` } : {})}
      render={({ field: { onChange, onBlur, value } }) => (
        <TextInput
          style={[fs.input, isMultiline && fs.inputMulti, errors[field.name] && fs.inputError]}
          value={value?.toString() ?? ''}
          onChangeText={onChange}
          onBlur={onBlur}
          placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}`}
          placeholderTextColor={neutral[400]}
          keyboardType={isNumber ? 'numeric' : isEmail ? 'email-address' : 'default'}
          autoCapitalize={isEmail ? 'none' : 'sentences'}
          multiline={isMultiline}
          numberOfLines={isMultiline ? 3 : 1}
          textAlignVertical={isMultiline ? 'top' : 'center'}
          autoCorrect={false}
        />
      )}
    />
  );
}

interface SelectFieldProps {
  field: FieldDescriptor;
  control: Control<any>;
  errors: FieldErrors<any>;
}

function SelectField({ field, control, errors }: SelectFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <Controller
      control={control}
      name={field.name}
      rules={field.required ? { required: `${field.label} is required` } : {}}
      render={({ field: { onChange, value } }) => {
        const selected = field.options?.find((o) => o.value === value);
        return (
          <>
            <TouchableOpacity
              style={[fs.input, fs.selectTrigger, errors[field.name] && fs.inputError]}
              onPress={() => setOpen(true)}
              activeOpacity={0.8}
            >
              <Text style={selected ? fs.selectValue : fs.selectPlaceholder} numberOfLines={1}>
                {selected?.label ?? `Select ${field.label}`}
              </Text>
              <ChevronDown size={15} color={neutral[400]} />
            </TouchableOpacity>

            <RNModal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
              <TouchableOpacity style={fs.selectBackdrop} activeOpacity={1} onPress={() => setOpen(false)} />
              <View style={fs.selectSheet}>
                <Text style={fs.selectSheetTitle}>{field.label}</Text>
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 280 }}>
                  {field.options?.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[fs.selectOption, opt.value === value && fs.selectOptionActive]}
                      onPress={() => {
                        onChange(opt.value);
                        setOpen(false);
                      }}
                      activeOpacity={0.75}
                    >
                      <Text style={[fs.selectOptionText, opt.value === value && fs.selectOptionTextActive]}>
                        {opt.label}
                      </Text>
                      {opt.value === value && <Check size={14} color={primaryScale[600]} />}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </RNModal>
          </>
        );
      }}
    />
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export interface ActivityFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => void;
  title?: string;
  fields?: FieldDescriptor[];
  initialValues?: Record<string, unknown> | null;
  loading?: boolean;
  accentColor?: string;
}

export default function ActivityFormModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  fields = [],
  initialValues,
  loading,
  accentColor = primaryScale[600],
}: ActivityFormModalProps) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  // Populate form when editing
  useEffect(() => {
    if (isOpen) {
      const defaults: Record<string, unknown> = {};
      fields.forEach((f) => {
        defaults[f.name] = initialValues?.[f.name] ?? '';
      });
      reset(defaults);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialValues]);

  return (
    <RNModal visible={isOpen} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={fs.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={fs.sheet}>
          {/* Header */}
          <View style={fs.header}>
            <Text style={fs.headerTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={fs.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={18} color={neutral[400]} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView
            style={fs.body}
            contentContainerStyle={fs.bodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {fields.map((field) => (
              <View key={field.name} style={fs.fieldWrap}>
                <FieldLabel label={field.label} required={field.required} />

                {field.type === 'select' ? (
                  <SelectField field={field} control={control} errors={errors} />
                ) : (
                  <TextField field={field} control={control} errors={errors} type={field.type} />
                )}

                {errors[field.name] && (
                  <Text style={fs.errorText}>{errors[field.name]?.message as string}</Text>
                )}
              </View>
            ))}
          </ScrollView>

          {/* Footer */}
          <View style={fs.footer}>
            <Button variant="outline" onPress={onClose} disabled={loading} style={fs.footerBtn}>
              Cancel
            </Button>
            <Button
              onPress={handleSubmit(onSubmit)}
              loading={loading}
              style={[fs.footerBtn, { backgroundColor: accentColor }]}
            >
              {initialValues ? 'Update' : 'Add'}
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </RNModal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const fs = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    ...shadows.soft,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: neutral[100],
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: neutral[900] },
  closeBtn: { padding: 4 },
  body: { flexShrink: 1 },
  bodyContent: { padding: 20, gap: 14, paddingBottom: 8 },
  footer: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: neutral[100],
  },
  footerBtn: { flex: 1 },
  fieldWrap: { gap: 6 },
  label: { fontSize: 13, fontWeight: '500', color: neutral[700] },
  input: {
    borderWidth: 1,
    borderColor: neutral[200],
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: neutral[900],
    backgroundColor: colors.white,
  },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  inputError: { borderColor: colors.red[400] },
  errorText: { fontSize: 11, color: colors.red[500] },
  selectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectValue: { flex: 1, fontSize: 14, color: neutral[900] },
  selectPlaceholder: { flex: 1, fontSize: 14, color: neutral[400] },
  selectBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  selectSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    ...shadows.soft,
  },
  selectSheetTitle: { fontSize: 15, fontWeight: '600', color: neutral[900], marginBottom: 12 },
  selectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: neutral[50],
  },
  selectOptionActive: { backgroundColor: primaryScale[50], borderRadius: 8, paddingHorizontal: 8 },
  selectOptionText: { fontSize: 14, color: neutral[700] },
  selectOptionTextActive: { color: primaryScale[600], fontWeight: '600' },
});
