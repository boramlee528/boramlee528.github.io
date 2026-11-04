// 사이트 내용은 이 파일만 고치면 됩니다.
// 공개 전 확인: 고객사명·내부 시스템명·비공개 수치가 들어가지 않았는지 살펴보세요.
// 휴대폰·이메일은 원문을 적지 않습니다. tools/contact-lock.mjs로 암호화한 값만 contactLock에 넣습니다.
window.PORTFOLIO = {
  site: {
    name: "RAMI",
    role: "서비스 기획자 · PM",
    headline: "13년 실무로 쌓은 운영 이해를 바탕으로, 복잡한 규칙을 쉬운 화면과 시스템으로 바꾸는 서비스 기획자",
    summary:
      "여행 플랫폼에서 고객 예약·결제 화면, 운영 관리자, 외부 API 연동을 기획하고 오픈까지 이끌었습니다. 현장 운영 경험으로 사용자와 운영자의 불편을 먼저 찾고, 개발·디자인·파트너사가 바로 쓸 수 있는 문서로 합의를 만듭니다.",
    scope: ["프론트(B2C) 기획", "백오피스 기획", "API 연동", "PM"],
  },

  // 공유 링크(#c=코드)로 열거나 PDF 저장 때 코드를 넣으면 풀립니다. 평소에는 빈칸으로 보입니다.
  contactLock: {
    "iter": 150000,
    "salt": "Vmi5SC1FyGtgFJ8LaCl5hw==",
    "iv": "ZWEaLtURw8vOPQtd",
    "data": "fPnqf3cAwX9oPbTUtG2F2tgxpobkv1+ZRg+qTZDaQpSHhX/8GSqH1ZlDjokfmjUnJ5ZCik7OJacGoSqnlljkwHb1kZ6Cc18flMG/cs5KhEr8ED7K0QiKBiQ="
  },

  facts: [
    ["총 경력", "13년 8개월"],
    ["서비스 기획", "8년 5개월"],
    ["지원 직무", "서비스기획 · PM · 프론트 기획"],
    ["주요 도메인", "예약 · 결제 · 정산 (여행 플랫폼)"],
  ],

  highlights: [
    { value: "85~90%", text: "반복 수작업을 관리자 기능·자동 처리로 전환" },
    { value: "90% 이상", text: "신규 관리자 도입 후 업무 전환율" },
    { value: "85~90%", text: "수기 결제 처리를 마이페이지 카드결제로 전환" },
    { value: "오류 0건", text: "운영 실무 기간 처리 정확도 100% 유지" },
  ],

  strengths: [
    ["사용자 화면 기획 (프론트)", "검색·예약·결제·마이페이지 흐름을 고객 문의 데이터로 개선했습니다. 복잡한 규정을 고객이 바로 이해하는 화면으로 풉니다."],
    ["관리자·운영 자동화 (백오피스)", "운영 데이터에서 반복 업무를 찾아 관리자 기능과 자동 처리로 바꾸고, 도입 후 전환율로 효과를 확인합니다."],
    ["외부 연동·프로젝트 관리 (PM)", "API 연동과 채널 입점에서 파트너사·개발사와 스펙과 일정을 맞추고, QA부터 오픈까지 관리합니다."],
    ["문서화와 AI 활용", "요구사항 정의서, 스토리보드, QA 체크리스트로 합의를 남깁니다. 최근 Claude·ChatGPT를 기획 업무에 적용하기 시작했고, 이 포트폴리오의 샘플 화면도 직접 기획한 뒤 AI로 구현했습니다."],
  ],

  career: [
    {
      company: "씨알에스코리아",
      title: "플랫폼 기획 대리",
      period: "2017.04 – 2025.08",
      length: "8년 5개월",
      job: "서비스기획",
      work: [
        "B2C 화면 기획: 검색·예약·결제·마이페이지, 카드 할인·수수료 결제 기능",
        "B2B 관리자 기획: 예약관리자 신규 구축, 자동 처리(자동발권)·환불 자동화로 운영 효율화",
        "외부 연동 PM: 제휴사 API 연동, 오픈마켓 채널 입점, 개발사·파트너 스펙과 일정 조율",
        "상품·가격 데이터 관리: 가격 등록·변동 관리, 경쟁사 가격 분석, 사전 오류 점검",
      ],
      results: [
        "반복 수작업의 약 85~90%를 관리자 기능·자동 처리로 전환",
        "마이페이지 카드결제 도입으로 수기 처리의 약 85~90%를 전환하고 관련 문의 감소",
      ],
    },
    {
      company: "타이드스퀘어",
      title: "발권팀 주임",
      period: "2014.07 – 2016.02",
      length: "1년 8개월",
      job: "온라인 예약 운영",
      work: ["온라인 예약·발권·변경 처리, 일정 변경 등 긴급 상황 대응, 비용 정산"],
      results: ["규정 검증과 사전 오류 관리로 처리 정확도 100%, 오류로 인한 벌금(ADM) 0건"],
    },
    {
      company: "에스엠타운트래블 ((주)에스엠컬처앤콘텐츠)",
      title: "컨설턴트 주임",
      period: "2010.12 – 2014.06",
      length: "3년 7개월",
      job: "기업 고객 예약 운영",
      work: ["기업 출장·단체 행사(MICE) 예약과 일정 조율, 비용 정산"],
      results: ["일 평균 30건 이상의 예약·변경을 무오류로 처리하고, 파트너와 실시간 소통으로 일정 리스크 최소화"],
    },
  ],

  education: [
    { school: "백석예술대학", major: "관광경영과 졸업 · 학점 4.38/4.5", period: "2009.03 – 2011.02" },
  ],

  skills: [
    ["문서·협업", ["PowerPoint", "Word", "Excel", "Slack", "Notion", "GitHub"]],
    ["AI 도구", ["Claude", "ChatGPT"]],
  ],

  // 프로젝트 분류. tags에 같은 이름이 있는 프로젝트도 함께 보입니다.
  filters: [
    { id: "all", label: "전체" },
    { id: "front", label: "프론트", area: "프론트" },
    { id: "backoffice", label: "백오피스", area: "백오피스" },
    { id: "api", label: "연동", area: "연동" },
    { id: "ai", label: "AI 기획", area: "AI 기획",
      note: "AI 기획은 실무 결과물이 아닌 개인 기획입니다. 실제 운영 경험(자동발권·접수 분석)을 바탕으로 AI 적용안을 설계했습니다." },
  ],

  // 최신순으로 적습니다.
  projects: [
    {
      id: "ai-ticket",
      area: "AI 기획",
      title: "자동발권 실패 원인 추천 (개인 기획)",
      period: "2026",
      summary: "자동발권 고도화 기획을 AI로 확장한 운영 화면 기획. 실무 결과물이 아닌 개인 기획 샘플입니다.",
      result: "실패 로그를 원인별로 묶어 조치를 추천하고, 담당자 승인 후 실행하는 관리자 화면을 설계",
      sample: "samples/bo-ticket.html#ai",
      sampleLabel: "AI 기획 샘플 화면 보기 →",
      details: [
        ["출발점", "자동발권율은 약 85~90%까지 올렸지만, 나머지 실패 건은 담당자가 응답 메시지를 한 건씩 읽고 처리했습니다."],
        ["기획", "실패 원인 분류 기준, AI 추천과 사람 승인의 경계(신뢰도 70% 미만 보류), 자동 재시도 허용 조건을 정의했습니다."],
        ["측정 지표", "수동 처리 건수, 재시도 성공률, 추천 정확도"],
      ],
    },
    {
      id: "api-ancillary",
      area: "연동",
      sample: "samples/api-ancillary.html#plan",
      aiSample: "samples/api-ancillary.html#ai",
      title: "Direct API 부가서비스",
      period: "2025",
      summary: "좌석·기내식·수하물 등 부가서비스를 API로 판매·정산",
      result: "부가서비스 판매 채널 확대, 오픈 이후 대리점 예약 전환율이 증가해 매출 증가에 기여한 것으로 판단",
      details: [
        ["기획", "부가서비스를 API로 제공하는 상세 기획을 버전별 시리즈로 다듬었습니다. 항공사 스펙은 항공사별로 확인했습니다."],
        ["협업", "관리자 개발사의 요청사항을 받아 확인·회신했습니다."],
      ],
    },
    {
      id: "api-direct",
      area: "연동",
      sample: "samples/api-direct.html#plan",
      aiSample: "samples/api-direct.html#ai",
      title: "Direct API 연동",
      period: "2024",
      summary: "여행사·OTA가 직접 호출하는 API 연동과 검수 시나리오",
      result: "여행사·대리점이 직접 호출하는 연동 채널 확보, 오픈 이후 대리점 예약 전환율이 증가해 매출 증가에 기여한 것으로 판단",
      details: [
        ["기획", "연동 개발 체크리스트와 연동 업체별 검수 시나리오를 작성했습니다."],
        ["역할", "예약관리자 기능 연동 및 오픈 테스트, API 통합 관리자의 대리점 기능 오픈 테스트"],
      ],
    },
    {
      id: "bo-ticket",
      area: "백오피스",
      tags: ["AI 기획"],
      title: "자동발권 통합운영 및 기능 고도화",
      period: "2020 – 2025",
      summary: "OTA별 자동발권 지원 현황·설정 통합 운영과 예외 케이스 고도화",
      result: "수동발권 처리를 시스템 자동발권으로 전환, 자동발권율 약 85~90% 수준 달성",
      // 값을 넣으면 프로젝트 상세에 샘플 화면 링크가 나타납니다.
      sample: "samples/bo-ticket.html#plan",
      aiSample: "samples/bo-ticket.html#ai",
      details: [
        ["문제 발견", "OTA마다 자동발권 지원 범위와 설정이 달라 운영이 분산되어 있었습니다."],
        ["정리", "OTA별 지원 현황, 자동발권 불가 설정, 배포·테스트 방법을 한곳에 모아 통합 운영 기준을 만들었습니다."],
        ["고도화", "로컬 운임 적용, 대리점별 자동발권 기능 제어, Endorsement 추가 기능을 기획하고 오류를 개선했습니다."],
      ],
    },
    {
      id: "bo-maintenance",
      area: "백오피스",
      sample: "samples/bo-maintenance.html#plan",
      aiSample: "samples/bo-maintenance.html#ai",
      title: "OTA 서비스 유지보수",
      period: "상시",
      summary: "운영 접수 분석, 기능 개선, 자동 환불 후속 개선",
      result: "대리점 기능개선·유지보수 후 반복 문의 건수 감소",
      details: [
        ["개선", "원인별로 기능 개선 안을 만들고 환불 자동화로 이어졌습니다."],
        ["확인", "자동 처리 건수는 오픈 후 별도 집계했습니다."],
      ],
    },
    {
      id: "bo-claims",
      area: "백오피스",
      tags: ["AI 기획"],
      sample: "samples/bo-claims.html#plan",
      aiSample: "samples/bo-claims.html#ai",
      title: "OTA 접수 시스템 유지보수·기능개선",
      period: "상시",
      summary: "OTA 접수 건 패턴 분석(금액 불일치 등)과 기능 개선",
      result: "대리점 기능개선·유지보수 후 반복 문의 건수 감소",
      details: [
        ["문제 발견", "접수 건을 모아 금액 불일치 같은 반복 케이스를 유형화했습니다."],
        ["개선", "유형별 원인에 맞춰 기능 개선 안을 만들었습니다."],
      ],
    },
    {
      id: "fr-cancel",
      area: "프론트",
      sample: "samples/fr-cancel.html#plan",
      aiSample: "samples/fr-cancel.html#ai",
      title: "무료취소 가능기간 표기",
      period: "2023.11",
      summary: "항공사별 무료취소 기한을 예약 화면에 노출해 취소 문의·분쟁 예방",
      result: "무료취소 기한을 예약 시점에 바로 확인할 수 있게 해 고객 편의성 향상",
      details: [
        ["문제", "무료취소 기한을 고객이 예약 후에야 알게 되어 취소 문의가 발생했습니다."],
        ["기획", "항공사별 무료취소 기간을 DB에 등록하고 예약 시점에 표기하는 기능을 정의했습니다(기획서 v0.7.1)."],
      ],
    },
    {
      id: "fr-tasf",
      area: "프론트",
      sample: "samples/fr-tasf.html#plan",
      aiSample: "samples/fr-tasf.html#ai",
      title: "마이페이지 TASF 카드결제",
      period: "2023.10",
      summary: "발권 수수료(TASF)를 마이페이지에서 카드로 추가 결제",
      result: "도입 후 기존 수기 처리의 약 85~90%가 카드결제로 전환되고 관련 문의 감소",
      details: [
        ["문제", "TASF(발권 수수료)를 별도로 지불하려면 수기 처리가 필요했습니다."],
        ["기획", "마이페이지에서 카드로 TASF를 결제하는 플로우와 결제 실패 처리를 정의했습니다."],
      ],
    },
    {
      id: "fr-market",
      area: "프론트",
      sample: "samples/fr-market.html#plan",
      aiSample: "samples/fr-market.html#ai",
      title: "오픈마켓 채널 신규 입점",
      period: "2023.06",
      summary: "오픈마켓 채널 신규 입점과 요금·예약 테스트",
      result: "신규 입점 완료, 오픈 이후 대리점 예약 전환율이 증가해 매출 증가에 기여한 것으로 판단",
      details: [
        ["기획", "오픈마켓 채널 신규 입점에 맞추어 요금 변경 여부 재확인 배치를 점검하고 항공사별 테스트 예약으로 검증했습니다."],
      ],
    },
    {
      id: "fr-calendar",
      area: "프론트",
      sample: "samples/fr-calendar.html#plan",
      aiSample: "samples/fr-calendar.html#ai",
      title: "국내선 캘린더 서치",
      period: "2022.08",
      summary: "날짜별 최저가를 한 화면에서 비교하는 검색 UX (PC 2022.08, 모바일 기획 2022.11)",
      result: "날짜별 운임을 한 화면에서 비교할 수 있게 해 고객 편의성 향상",
      details: [
        ["문제", "날짜를 하나씩 바꿔 가며 최저가를 찾아야 했습니다."],
        ["기획", "날짜별 운임을 달력에 한번에 보여주는 검색 화면을 PC와 모바일로 나눠 설계했습니다(서비스 기획서 v2.1)."],
      ],
    },
    {
      id: "fr-card",
      area: "프론트",
      sample: "samples/fr-card.html#plan",
      aiSample: "samples/fr-card.html#ai",
      title: "카드 청구할인",
      period: "2022.05",
      summary: "카드사 청구할인을 예약·결제 화면에 반영하고 운영 중 수정사항 관리 (v1.2 2024.02)",
      result: "카드사 청구할인을 예약·결제 화면에서 확인할 수 있게 해 고객 편의성 향상",
      details: [
        ["기획", "카드사별 청구할인 조건을 예약·결제 화면에 반영하고, 국내선 예약카드에서도 확인할 수 있게 했습니다."],
        ["운영", "2차 버전 QA와 운영 중 수정사항을 관리하며 기획서를 v1.0에서 v1.2까지 개정했습니다."],
      ],
    },
    {
      id: "bo-intl",
      area: "백오피스",
      sample: "samples/bo-intl.html#plan",
      aiSample: "samples/bo-intl.html#ai",
      title: "예약관리자 신규 구축 (해외)",
      period: "2021.11",
      summary: "해외항공 신규 예약관리자(예약·발권·환불 처리, 알림톡)",
      result: "담당자 수동 처리를 시스템 처리로 바꿔, 신규 관리자 기능개선 후 업무 전환율 90% 이상",
      details: [
        ["배경", "노후된 해외항공 관리자를 신규 구축해 예약·발권·환불 처리를 한 화면에서 다루도록 했습니다."],
        ["역할", "신규 예약관리자 기획(v2.9~v3.0), 마이페이지 대표 상태값 노출 정의, 알림톡·SMS 메시지 정리, 홈페이지 통합 테스트, 오픈 체크리스트"],
        ["오픈 후", "개선요청 진행사항을 관리하며 기능을 보완했습니다."],
      ],
    },
    {
      id: "bo-domestic",
      area: "백오피스",
      sample: "samples/bo-domestic.html#plan",
      aiSample: "samples/bo-domestic.html#ai",
      title: "예약관리자 신규 구축 (국내)",
      period: "2021.07",
      summary: "국내선 전용 관리자 신규 구축(예약카드, 오류 리스트, 청구할인)",
      result: "담당자 수동 처리를 시스템 처리로 바꿔 업무 약 85~90%를 관리자 기능으로 전환하고 관련 문의 건수 감소",
      details: [
        ["배경", "국제선 예약관리자를 기반으로 국내선 전용 예약관리자를 신규 기획했습니다."],
        ["역할", "상세 기획서, 사이트맵·IA, API 스펙·DB 정보 정리, 알림톡 템플릿·결제정보 항목 정의, 기능 안내 매뉴얼, 체크리스트 작성"],
        ["포인트", "예약 상태 히스토리 정리, 예약오류 리스트 기능 추가, 예약카드 수정과 청구할인 반영"],
      ],
    },
  ],
};
