import React from "react";
import styles from "./LabelInput.module.css";
import visibilityOnIcon from "@/assets/icons/btn_visibility_on_24px.svg";
import visibilityOffIcon from "@/assets/icons/btn_visibility_off_24px.svg";

export default function LabelInput({
  id,
  label,
  required = false,
  disabled = false,
  value,
  defaultValue,
  onChange,
  type = 'text',
  multiline = false,
  placeholder = '',
  rows = 4,
  maxLength,
  min,
  max,
  step,
  error, // 에러 prop 추가
  className = '',
  controlClassName = '',
  defaultEyeIconVisible = false,
}) {
  const [showPw, setShowPw] = React.useState(false);
  const isPassword = type === 'password';

  // 훅은 항상 호출(룰오브훅스 준수)
  const generatedId = React.useId();
  const inputId = id ?? generatedId;

  const controlled = value !== undefined;
  const handleChange = (e) => onChange && onChange(e.target.value);

  return (
    <div className={`${styles.field} ${className}`.trim()}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}{required && <span className={styles.requiredMark}>*</span>}
        </label>
      )}
      {/* 에러 스타일 추가 */}
      <div className={`${styles.control} ${multiline ? styles.asTextarea : styles.asInput} ${error ? styles.error : ''} ${controlClassName}`.trim()}>
        {!multiline ? (
          <input
            id={inputId}
            className={styles.input}
            type={isPassword ? (showPw ? 'text' : 'password') : type}
            // ✅ value/defaultValue 자동 분기 (경고 방지)
            {...(controlled ? { value: value ?? '' } : { defaultValue })}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={maxLength}
            min={min}
            max={max}
            step={step}
            autoComplete={isPassword ? 'new-password' : 'off'}
          />
        ) : (
          <textarea
            id={inputId}
            className={`${styles.input} ${styles.textarea}`}
            {...(controlled ? { value: value ?? '' } : { defaultValue })}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled}
            rows={rows}
            maxLength={maxLength}
          />
        )}

        {isPassword && (
          <button
            type="button"
            className={styles.eyeBtn}
            aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 보기'}
            onClick={() => setShowPw((v) => !v)}
            disabled={disabled}
          >
            <img
              src={
                showPw
                  ? visibilityOffIcon
                  : defaultEyeIconVisible
                    ? visibilityOnIcon
                    : visibilityOffIcon
              }
              alt=""
              width="20"
              height="20"
            />
          </button>
        )}
      </div>
      {/* 비밀번호 =/= 비밀번호 확인 시 */}
      {error && <div className={styles.errorMessage}>{error}</div>}
    </div>
  );
}
