import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import LabelInput from "@/components/LabelInput";
import Modal from "./Modal";
import OneButtonPopup from "./OneButtonPopup";
import { postMyCorp, patchMyCorp } from "@/api/invest";
import { postInvestCorp } from "@/api/compare";

const MIN_INVESTMENT_AMOUNT = 50_000_000;
const MAX_INVESTMENT_AMOUNT = 1_000_000_000;

function InvestmentModal({ isOpen, company, onClose, onSuccess, initialData }) {
  const navigate = useNavigate();
  const isEditMode = !!initialData; // 수정 모달이니?

  const [investor, setInvestor] = useState(initialData?.investor || "");
  const [amount, setAmount] = useState(String(initialData?.amount ?? ""));
  const [comment, setComment] = useState(initialData?.comment || "");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [submitError, setSubmitError] = useState("");

  // initialData가 변경되면 상태를 다시 초기화합니다. // FIXME: 이거 굳이 필요?
  useEffect(() => {
    if (!isOpen) return;

    setInvestor(initialData?.investor || "");
    setAmount(String(initialData?.amount ?? ""));
    setComment(initialData?.comment || "");
    setPassword("");
    setPasswordConfirm("");
    setSubmitError("");
  }, [isOpen, initialData]);

  // 비밀번호 일치 여부 확인
  const isPasswordMatching = password === passwordConfirm;
  const passwordError =
    !password.trim() && passwordConfirm.trim()
      ? "비밀번호를 먼저 입력해주세요."
      : password.trim() && !passwordConfirm.trim()
        ? "비밀번호 확인을 입력해주세요."
        : password.trim() && !isPasswordMatching
          ? "비밀번호가 일치하지 않습니다."
          : "";

  // 모든 필수 필드가 채워졌는지 확인
  const normalizedAmount = String(amount ?? "").trim();
  const amountValue = Number(normalizedAmount);
  const hasPassword = password.trim() !== "";
  const hasPasswordConfirm = passwordConfirm.trim() !== "";
  const isPasswordValid = isEditMode
    ? (!hasPassword && !hasPasswordConfirm) ||
      (hasPassword && hasPasswordConfirm && isPasswordMatching)
    : hasPassword && hasPasswordConfirm && isPasswordMatching;
  const isFormValid =
    investor.trim() !== "" &&
    normalizedAmount !== "" &&
    Number.isFinite(amountValue) &&
    amountValue >= MIN_INVESTMENT_AMOUNT &&
    amountValue <= MAX_INVESTMENT_AMOUNT &&
    isPasswordValid;

  const [isModalOpen, setIsModalOpen] = useState(false);

  // company prop이 없으면 렌더링하지 않거나, 기본값을 설정할 수 있습니다.
  if (!company) return null;

  /** 투자 요청을 제출하는 함수 */
  const handleInvestSubmit = async () => {
    const payload = {
      name: investor, // 'investor'를 'name'으로 변경
      amount: amountValue,
      amount_comment: comment,
      password: isEditMode ? initialData.password : password,
      ...(isEditMode
        ? hasPassword
          ? { newPassword: password, newPasswordConfirm: passwordConfirm }
          : {}
        : { passwordConfirm }),
    };

    try {
      setSubmitError("");
      if (isEditMode) {
        await patchMyCorp(initialData.id, payload); // 수정 API 호출
      } else {
        await postMyCorp(company.id, payload); // 생성 API 호출
        await postInvestCorp(company.id);
      }
      setIsModalOpen(true); // 성공 시에만 팝업을 띄웁니다.
    } catch (error) {
      console.error(`투자 ${isEditMode ? "수정" : "하기"} 실패:`, error);
      setSubmitError(
        error.response?.status === 403
          ? "비밀번호가 일치하지 않습니다. 다시 확인해주세요."
          : error.response?.data?.message || "요청을 처리하지 못했습니다. 다시 시도해주세요."
      );
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="기업에 투자하기"
        className="investment-modal"
        footer={{
          cancelText: "취소",
          confirmText: isEditMode ? "수정하기" : "투자하기",
          onConfirm: handleInvestSubmit,
          isConfirmDisabled: !isFormValid,
        }}
      >
        <div className="invest-info">
          <div className="invest-label">투자 기업 정보</div>
          <div className="company-info investment-company-info">
            <div
              className="company-logo"
              role="img"
              aria-label={`${company.corp_image} 로고`}
              style={{
                backgroundImage: company.corp_image
                  ? `url(${company.corp_image})`
                  : "none",
              }}
            />
            <div className="company-name modal-company-name">
              {company.corp_name}
            </div>
            <div className="company-category">{company.corp_tag}</div>
          </div>
        </div>
        <LabelInput
          className="investment-field"
          controlClassName="investment-control"
          label="투자자 이름"
          value={investor}
          onChange={setInvestor}
          placeholder="투자자 이름을 입력해 주세요"
          required
        />
        <LabelInput
          className="investment-field"
          controlClassName="investment-control"
          label="투자 금액"
          type="number"
          value={amount}
          onChange={setAmount}
          placeholder="투자 금액을 입력해 주세요"
          min={MIN_INVESTMENT_AMOUNT}
          max={MAX_INVESTMENT_AMOUNT}
          step={1}
          required
        />
        <LabelInput
          className="investment-field"
          controlClassName="investment-control"
          label="투자 코멘트"
          value={comment}
          onChange={setComment}
          placeholder="투자에 대한 코멘트를 입력해 주세요"
          multiline
        />
        <LabelInput
          className="investment-field"
          controlClassName="investment-control"
          defaultEyeIconVisible
          label={isEditMode ? "새 비밀번호" : "비밀번호"}
          type="password"
          value={password}
          onChange={setPassword}
          placeholder={isEditMode ? "변경할 비밀번호를 입력해주세요" : "비밀번호를 입력해주세요"}
          required={!isEditMode}
        />
        <LabelInput
          className="investment-field"
          controlClassName="investment-control"
          defaultEyeIconVisible
          label={isEditMode ? "새 비밀번호 확인" : "비밀번호 확인"}
          type="password"
          value={passwordConfirm}
          onChange={setPasswordConfirm}
          placeholder="비밀번호를 다시 한 번 입력해주세요"
          error={passwordError}
          required={!isEditMode}
        />
        {submitError && (
          <p className="input-error" role="alert">
            {submitError}
          </p>
        )}
      </Modal>
      {isModalOpen && (
        <OneButtonPopup
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          message={`투자가 ${isEditMode ? "수정" : "완료"}되었어요!`}
          onButtonClick={() => {
            setIsModalOpen(false);
            onClose();
            if (onSuccess) onSuccess();
            else navigate('/investment');
          }}
        />
      )}
    </>
  );
}

export default InvestmentModal;
