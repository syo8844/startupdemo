import React, { useCallback, useEffect, useState } from 'react';
import CardContainer from '../../components/CardContainer';
import LargeButton from '@/components/LargeButton';
import './ComparePage.css';
import Pagination from '@/components/Pagination';
import Dropdown from '@/components/Dropdown';
import InvestmentModal from '@/components/modals/InvestmentModal';
import {
  getCompareList,
  getRankList,
  deleteMyCorpAll,
  deleteCompareCorp,
  deleteCompareCorpAll,
} from '@/api/compare';

const formatNumber = (value) =>
  new Intl.NumberFormat('ko-KR').format(value || 0);

const formatEok = (value) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return '-';

  return `${new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits: 1,
  }).format(amount / 100_000_000)}억 원`;
};

export default function ComparePage() {
  const [compareOrder, setCompareOrder] = useState('investmentHighest');
  const [rankOrder, setRankOrder] = useState('investmentHighest');
  const [myCompany, setMyCompany] = useState(null);
  const [compareCompanies, setCompareCompanies] = useState([]);
  const [resultList, setResultList] = useState([]);
  const [rankList, setRankList] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showCompareButton, setShowCompareButton] = useState(true);

  const orderOptions = [
    { value: 'investmentHighest', label: '누적 투자금액 높은순' },
    { value: 'investmentLowest', label: '누적 투자금액 낮은순' },
    { value: 'salesHighest', label: '매출액 높은순' },
    { value: 'salesLowest', label: '매출액 낮은순' },
    { value: 'employeeHighest', label: '고용 인원 많은순' },
    { value: 'employeeLowest', label: '고용 인원 적은순' },
  ];

  const handleCompareClick = async () => {
    if (!myCompany) {
      alert("먼저 '나의 기업'을 선택해주세요!");
      return;
    }
    if (compareCompanies.length === 0) {
      alert('비교할 기업을 1개 이상 선택해주세요!');
      return;
    }

    setShowCompareButton(false);

    try {
      const response = await getCompareList({ order: compareOrder });
      const rankResponse = await getRankList({ order: rankOrder });
      setResultList(response.data);
      setRankList(rankResponse.data);
    } catch (error) {
      setShowCompareButton(true);
      console.error('기업 비교 API 호출 중 오류: ', error);
      alert('기업 비교 중 오류가 발생하였습니다.');
    }
  };

  const sortedResultList = resultList;

  const handleSelectMyCompany = useCallback((company) => {
    setMyCompany(company);
  }, []);

  const handleConfirmCompare = useCallback((companies) => {
    setCompareCompanies(companies);
  }, []);

  const handleRemoveMyCompany = async () => {
    await deleteCompareCorpAll();
    await deleteMyCorpAll();
    setMyCompany(null);
    setCompareCompanies([]);
  };

  const handleRemoveCompareCompany = async (companyId) => {
    try {
      await deleteCompareCorp(companyId);
      setCompareCompanies((companies) =>
        companies.filter((company) => company.id !== companyId),
      );
    } catch (error) {
      console.error('비교 기업 삭제 중 오류:', error);
      alert('비교 기업 삭제 중 오류가 발생하였습니다.');
    }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
      } catch (error) {
        console.error('초기화 중 오류 발생:', error);
      }
    };
    initialize();
  }, []);

  useEffect(() => {
    setShowCompareButton(true);
  }, [myCompany, compareCompanies]);

  useEffect(() => {
    if (resultList.length === 0) return;

    const fetchResultData = async () => {
      try {
        const response = await getCompareList({ order: compareOrder });
        setResultList(response.data);
      } catch (error) {
        console.error('비교 결과 목록 조회 중 오류:', error);
      }
    };
    fetchResultData();
  }, [compareOrder]);

  useEffect(() => {
    if (resultList.length === 0) return;

    const fetchRankData = async () => {
      try {
        const rankResponse = await getRankList({ order: rankOrder });
        setRankList(rankResponse.data);
      } catch (error) {
        console.error('순위 목록 조회 중 오류:', error);
      }
    };
    fetchRankData();
  }, [rankOrder]);

  return (
    <div className="compare-page">
      <CardContainer
        title="나의 기업을 선택해 주세요!"
        btnName={
          !myCompany ? (
            ''
          ) : !showCompareButton ? (
            '다른 기업 비교하기'
          ) : (
            <>
              <svg
                className="reset-icon"
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  d="M20 11a8 8 0 0 0-14.9-4L3 10m0-6v6h6m-5 3a8 8 0 0 0 14.9 4L21 14m0 6v-6h-6"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
              전체 초기화
            </>
          )
        }
        selectedCompany={myCompany}
        onSelectCompany={handleSelectMyCompany}
        onRemove={handleRemoveMyCompany}
        onHeaderButtonClick={
          showCompareButton ? handleRemoveMyCompany : undefined
        }
        headerButtonClassName="reset-button"
        isMyCompanyCard
      />

      {showCompareButton && myCompany && (
        <CardContainer
          title="어떤 기업이 궁금하세요?"
          btnName="기업 추가하기"
          onSelectCompare={handleConfirmCompare}
          onRemove={handleRemoveCompareCompany}
          companyList={compareCompanies}
          myCompanyId={myCompany.id}
          isCompareAddDisabled={compareCompanies.length >= 5}
        />
      )}

      {showCompareButton && (
        <>
          <div className="btn-center">
            <LargeButton
              onClick={handleCompareClick}
              disabled={!myCompany || compareCompanies.length === 0}
              variant={
                !myCompany || compareCompanies.length === 0
                  ? 'inactive'
                  : 'active'
              }
            >
              기업 비교하기
            </LargeButton>
          </div>
        </>
      )}

      {!showCompareButton && resultList.length > 0 ? (
        <>
          <div className="result-section">
            <section className="table-section">
              <div className="section-header">
                <div className="title section-title">비교 결과 확인하기</div>
                <Dropdown
                  value={compareOrder}
                  onChange={setCompareOrder}
                  options={orderOptions}
                />
              </div>

              <div className="grid-table result">
                <div className="grid-header">
                  <div className="grid-cell">기업명</div>
                  <div className="grid-cell">기업 소개</div>
                  <div className="grid-cell">카테고리</div>
                  <div className="grid-cell">누적 투자 금액</div>
                  <div className="grid-cell">매출액</div>
                  <div className="grid-cell">고용 인원</div>
                </div>

                {resultList.map((corp, index) => {
                  const isMyCompany = myCompany && myCompany.id === corp.id;
                  const myCompanyRowStyle = isMyCompany ? 'myCompany-row' : '';
                  const isLastRow = index === sortedResultList.length - 1;
                  const lastRowStyle = isLastRow ? 'is-last-row' : '';
                  return (
                    <div
                      key={corp.id}
                      className={`grid-row ${myCompanyRowStyle} ${lastRowStyle}`}
                    >
                      <div className="grid-cell company-cell">
                        <img
                          src={corp.corp_image}
                          alt={`${corp.corp_name} 로고`}
                          className="corp-logo"
                        />
                        <div className="corp-name">{corp.corp_name}</div>
                      </div>
                      <div className="grid-cell corp-intro-cell">
                        <div className="corp-intro">{corp.corp_profile}</div>
                      </div>
                      <div className="grid-cell">{corp.corp_tag}</div>
                      <div className="grid-cell">
                        {formatEok(corp.total_investment)}
                      </div>
                      <div className="grid-cell">
                        {formatEok(corp.corp_sales)}
                      </div>
                      <div className="grid-cell">
                        {formatNumber(corp.employee)} 명
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
            <section className="table-section">
              <div className="section-header">
                <div className="title section-title">기업 순위 확인하기</div>
                <Dropdown
                  value={rankOrder}
                  onChange={setRankOrder}
                  options={orderOptions}
                />
              </div>
              <div className="grid-table rank">
                <div className="grid-header">
                  <div className="grid-cell">순위</div>
                  <div className="grid-cell">기업명</div>
                  <div className="grid-cell">기업 소개</div>
                  <div className="grid-cell">카테고리</div>
                  <div className="grid-cell">누적 투자 금액</div>
                  <div className="grid-cell">매출액</div>
                  <div className="grid-cell">고용 인원</div>
                </div>
                {rankList.map((corp, index) => {
                  const isMyCompany = myCompany && myCompany.id === corp.id;
                  const myCompanyRowStyle = isMyCompany ? 'myCompany-row' : '';
                  const isLastRow = index === rankList.length - 1;
                  const lastRowStyle = isLastRow ? 'is-last-row' : '';
                  return (
                    <div
                      key={corp.id}
                      className={`grid-row ${myCompanyRowStyle} ${lastRowStyle}`}
                    >
                      <div className="grid-cell">{corp.rank}위</div>
                      <div className="grid-cell company-cell">
                        <img
                          src={corp.logo || corp.corp_image}
                          alt={`${corp.corp_name} 로고`}
                          className="corp-logo"
                        />
                        <div className="corp-name">{corp.corp_name}</div>
                      </div>
                      <div className="grid-cell corp-intro-cell">
                        <div className="corp-intro">{corp.corp_profile}</div>
                      </div>
                      <div className="grid-cell">{corp.corp_tag}</div>
                      <div className="grid-cell">
                        {formatEok(corp.total_investment)}
                      </div>
                      <div className="grid-cell">
                        {formatEok(corp.corp_sales)}
                      </div>
                      <div className="grid-cell">
                        {formatNumber(corp.employee)} 명
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
          <div className="btn-center">
            <LargeButton onClick={() => setIsModalOpen(true)}>
              나의 기업에 투자하기
            </LargeButton>
          </div>
        </>
      ) : (
        <></>
      )}

      {isModalOpen && myCompany && (
        <InvestmentModal
          isOpen={isModalOpen}
          company={myCompany}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
