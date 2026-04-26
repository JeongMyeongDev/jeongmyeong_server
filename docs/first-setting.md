# 초기 설정

## 사전 준비

- Node.js 18 이상 설치
- npm 또는 yarn 패키지 매니저

## NestJS CLI 설치

프로젝트 개발을 위해 NestJS CLI를 글로벌로 설치한다.

```bash
npm install -g @nestjs/cli
```

설치 확인:
```bash
nest --version
```

## 프로젝트 다운로드

프로젝트를 로컬에 다운로드한다.

```bash
git clone <repository-url>
cd JeongMyeong
```

또는 압축 파일을 다운로드하여 압축을 해제한다.

## 의존성 설치

루트 디렉토리에서 다음 명령어를 실행하여 모든 의존성을 설치한다.

```bash
npm install
```

이 명령어는 백엔드와 프론트엔드의 의존성을 모두 설치한다.

## 환경 변수 설정

백엔드 디렉토리(`back/`)에 `.env` 파일을 생성한다.

```bash
cp back/.env.example back/.env
```

`.env` 파일을 열고 Supabase 연결 정보를 입력한다.

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/postgres?sslmode=require"
```

> Supabase 대시보드 → Project Settings → Database → Connection string 에서 값을 복사한다.

## 백엔드 설정

백엔드 디렉토리로 이동하여 추가 설정을 확인한다.

```bash
cd back
npm install  # 이미 루트에서 설치했다면 생략 가능
```

### 백엔드 실행

개발 모드로 백엔드를 실행하려면:

```bash
npm run start:dev
```

프로덕션 모드로 빌드하고 실행하려면:

```bash
npm run build
npm run start:prod
```

## 데이터베이스 마이그레이션 (Prisma)

백엔드는 Prisma ORM을 사용하여 PostgreSQL(Supabase) 스키마를 관리한다.

### 최초 설정 시 (클론 후 처음 실행)

`.env`에 `DATABASE_URL`이 설정된 상태에서 아래 명령어를 실행한다.

```bash
cd back
npm run prisma:migrate:dev
```

이 명령어는 `prisma/migrations/` 폴더의 모든 마이그레이션을 순서대로 적용하고, Prisma Client를 자동 생성한다.

### 스키마 변경 후 (모델 수정 시)

`prisma/schema.prisma`를 수정한 뒤 아래 명령어로 새 마이그레이션을 생성한다.

```bash
cd back
npm run prisma:migrate:dev
# 마이그레이션 이름 입력 예: add_user_role
```

### Prisma Client 재생성

마이그레이션 없이 클라이언트만 재생성하려면:

```bash
cd back
npm run prisma:generate
```

### Prisma Studio (GUI로 DB 확인)

```bash
cd back
npm run prisma:studio
```

브라우저에서 `http://localhost:5555`로 접속하여 데이터를 직접 조회·수정할 수 있다.

## 프론트엔드 설정

프론트엔드 디렉토리로 이동하여 설정한다.

```bash
cd front
npm install  # 이미 루트에서 설치했다면 생략 가능
```

### 프론트엔드 실행

개발 서버를 실행하려면:

```bash
npm run dev  # 또는 해당 프레임워크의 시작 명령어
```

## 전체 프로젝트 실행

모든 서비스를 동시에 실행하려면 별도의 터미널에서 각 서비스를 시작한다.

### 백엔드 (포트 3000 기본)
```bash
cd back/jeong-myeong && npm run start:dev
```

### 프론트엔드 (포트 3001 등)
```bash
cd front && npm run dev
```

## 테스트 실행

프로젝트의 테스트를 실행하려면:

### 백엔드 테스트
```bash
cd back/jeong-myeong
npm run test
```

### E2E 테스트
```bash
cd back/jeong-myeong
npm run test:e2e
```

## 코드 품질 검사

### 백엔드 린팅
```bash
cd back/jeong-myeong
npm run lint
```

### 코드 포맷팅
```bash
cd back/jeong-myeong
npm run format
```

## 문제 해결

- 포트 충돌: 기본 포트가 사용 중이면 환경 변수나 설정 파일에서 포트를 변경한다
- 의존성 오류: `npm install`을 다시 실행하거나 `node_modules`를 삭제하고 재설치한다
- 빌드 오류: TypeScript 설정이나 Node.js 버전을 확인한다

## 추가 설정

프로젝트에 따라 추가 환경 설정이 필요할 수 있다:
- 데이터베이스 연결
- API 키 설정
- 환경 변수 파일 (.env)