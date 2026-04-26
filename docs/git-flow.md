# Git Flow

## 브랜치 종류

### 1. main
- 배포 가능한 안정 브랜치
- 실제 운영/배포 기준 브랜치
- 직접 커밋하지 않는다
- `develop`, `release/*`, `hotfix/*`에서만 merge한다

### 2. develop
- 다음 배포를 준비하는 통합 브랜치
- 기능 개발이 먼저 모이는 기본 브랜치
- 개발 중인 최신 상태를 유지한다

### 3. feature/*
- 새로운 기능 개발 브랜치
- `develop`에서 분기하고, 작업이 끝나면 `develop`으로 merge한다

예시:
- `feature/auth-login`
- `feature/debate-thread`
- `feature/term-consensus`

### 4. release/*
- 배포 직전 점검 및 마무리 브랜치
- `develop`에서 분기한다
- 버전 정리, 문서 수정, 사소한 버그 수정만 수행한다
- 완료 후 `main`과 `develop`에 모두 반영한다

예시:
- `release/v0.1.0`

### 5. hotfix/*
- 운영 중 긴급 수정 브랜치
- `main`에서 분기한다
- 수정 후 `main`과 `develop`에 모두 반영한다
- 즉, 배포 하여 운영 중에 문제가 생겼을 경우 사용하는 브런치다

예시:
- `hotfix/login-token-bug`

### 6. refactor/*
- 디렉토리 구조 변경
- 중복 코드 분리 및 구조 개선
- 의존성/모듈 책임 재정리

예시:
- `refactor/auth-module`
- `refactor/debate-service`
- `refactor/thread-structure`
- `refactor/api-response-format`

## 작업 흐름

### 기능 개발
1. `develop`에서 `feature/*` 브랜치를 만든다
2. 기능을 개발한다
3. PR 또는 코드 리뷰 후 `develop`으로 merge한다

### 배포 준비
1. 배포 시점이 되면 `develop`에서 `release/*` 브랜치를 만든다
2. 테스트, 문서 수정, 버전 정리를 진행한다
3. 안정화가 끝나면 `main`에 merge한다
4. 이후 변경사항을 `develop`에도 반영한다

### 긴급 수정
1. 운영 버그가 발생하면 `main`에서 `hotfix/*`를 만든다
2. 수정 후 `main`에 merge한다
3. 동일한 수정사항을 `develop`에도 반영한다

## 브랜치 네이밍 규칙

- 기능: `feature/기능명` 개발 중인, 개발 한 기능명을 작성한다
- 수정: `fix/수정내용` 수정한 부분을 간략하게 요약하여 작성한다
- 긴급수정: `hotfix/문제명` 수정과 동일
- 배포준비: `release/버전명` 
- 리팩토링: `refactor/대상명`

예시:
- `feature/debate-room`
- `fix/thread-sort`
- `refactor/auth-module`

## 커밋 메시지 규칙

형식:
`type: 내용`

예시:
- `feat: 토론 스레드 생성 기능 추가`
- `fix: 로그인 토큰 검증 오류 수정`
- `refactor: 토론 서비스 계층 분리`
- `test: 합의 생성 로직 테스트 추가`

권장 type:
- `feat`: 기능 개발
- `fix`: 수정
- `refactor`: 구조 변경
- `test`: 테스트
- `chore`: 문서 업데이트, 패키지 설정 등

## 규칙

- `main`에 직접 커밋하지 않는다
- 큰 기능은 반드시 `feature/*`로 분리한다
- 배포 전에는 가능하면 `release/*`를 거친다
- 커밋은 작은 작업 단위로 자주 진행한다
- merge 전 최소한 본인 테스트는 끝낸다