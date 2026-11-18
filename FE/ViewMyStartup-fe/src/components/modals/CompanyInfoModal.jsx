import { useEffect, useState } from "react";
import Modal from "./Modal";
import { getCompanyDetail } from "@/api/companyDetail";
import "./CompanyInfoModal.css";

const formatEokWon = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "-";
  const eok = amount / 100_000_000;
  const formatted = eok >= 10 ? Math.round(eok) : Math.round(eok * 10) / 10;
  return `${formatted.toLocaleString("ko-KR")}억 원`;
};

function CompanyInfoModal({ isOpen, companyId, onClose }) {
  const [company, setCompany] = useState(null);
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen || !companyId) return undefined;

    let cancelled = false;
    setLoading(true);
    setError("");
    setCompany(null);
    setInvestments([]);

    getCompanyDetail({ id: companyId })
      .then(({ company: companyData, investments: investmentData }) => {
        if (cancelled) return;
        setCompany(companyData);
        setInvestments(investmentData);
      })
      .catch(() => {
        if (!cancelled) setError("기업 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, companyId]);

  const totalInvestment = investments.reduce((total, item) => total + item.amount, 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="company-info-modal">
        {loading && <p className="company-info-modal__state">기업 정보를 불러오는 중...</p>}
        {error && <p className="company-info-modal__error">{error}</p>}
        {company && (
          <>
            <header className="company-info-modal__header">
              {company.corp_image && (
                <img
                  className="company-info-modal__logo"
                  src={company.corp_image}
                  alt=""
                />
              )}
              <div>
                <h2 className="company-info-modal__name">{company.corp_name}</h2>
                <span className="company-info-modal__category">{company.corp_tag}</span>
              </div>
            </header>

            <section className="company-info-modal__metrics" aria-label="기업 주요 지표">
              <div className="company-info-modal__metric">
                <span>누적 투자 금액</span>
                <strong>{formatEokWon(company.total_investment)}</strong>
              </div>
              <div className="company-info-modal__metric">
                <span>매출액</span>
                <strong>{formatEokWon(company.corp_sales)}</strong>
              </div>
              <div className="company-info-modal__metric">
                <span>고용 인원</span>
                <strong>
                  {Number.isFinite(company.employees)
                    ? `${company.employees.toLocaleString("ko-KR")}명`
                    : "-"}
                </strong>
              </div>
            </section>

            <section className="company-info-modal__about">
              <h3>기업 소개</h3>
              <p>{company.corp_profile || "기업 소개가 없습니다."}</p>
            </section>

            <section className="company-info-modal__investments">
              <div className="company-info-modal__investments-title">
                <h3>View My Startup에서 받은 투자</h3>
                <strong>총 {formatEokWon(totalInvestment)}</strong>
              </div>
              {investments.length > 0 ? (
                <ul>
                  {investments.slice(0, 5).map((investment) => (
                    <li key={investment.id}>
                      <span>{investment.investor}</span>
                      <span>{formatEokWon(investment.amount)}</span>
                      <span>{investment.comment || "-"}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="company-info-modal__state">투자 내역이 없습니다.</p>
              )}
            </section>
          </>
        )}
      </div>
    </Modal>
  );
}

export default CompanyInfoModal;
