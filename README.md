# capstone_MotionBrain
캡스톤디자인 2 진행

## 협업 매뉴얼

### 작업 흐름

```
이슈 만들기 → 브랜치 만들기 → 작업·커밋 → 푸시 → PR → 팀원 1명 확인 → Squash and merge
```

### 규칙

1. `main`에 직접 커밋·푸시하지 않는다.
2. 작업 하나에 브랜치 하나, 2~3일 안에 합친다.
3. PR은 팀원 1명이 확인한 뒤 합친다.
4. 합친 브랜치는 삭제한다.
5. 웹캠 녹화 영상은 절대 커밋하지 않는다.

### 브랜치 종류

| 브랜치 | 용도 | 예시 |
|---|---|---|
| `main` | 최종본 (직접 작업 금지) | |
| `release/capstone`, `release/devday` | 행사 1주 전 출품본 (버그 수정만) | |
| `feat/` | 새 기능 | `feat/rps-game` |
| `fix/` | 버그 수정 | `fix/hand-lost` |
| `asset/` | 이미지·스프라이트·소리 | `asset/cat-idle-sprite` |
| `refactor/` | 동작은 그대로, 코드만 정리 | `refactor/game-code-cleanup` |
| `docs/` | 문서 | `docs/manual` |
| `chore/` | 설정·기타 | `chore/folder-setup` |

- 브랜치 이름: `종류/짧은-설명` (영어 소문자, 단어 사이 `-`)
- 커밋 메시지: `종류: 한 줄 설명` (예: `feat: 가위바위보 결과 화면 추가`)

### 처음 한 번

```bash
git config --global user.name "내 이름"
git config --global user.email "GitHub 가입 이메일"
git clone https://github.com/yuJunhyk/capstone_MotionBrain.git
cd capstone_MotionBrain
```

### 작업 순서

```bash
# 1. 최신 main 받고 브랜치 만들기
git checkout main
git pull
git checkout -b feat/rps-game

# 2. 작업 후 커밋·푸시
git add .
git commit -m "feat: 가위바위보 결과 화면 추가"
git push -u origin feat/rps-game
```

3. GitHub에서 **Compare & pull request** → base가 `main`인지 확인 → 리뷰어 1명 지정 → 생성
4. 승인되면 **Squash and merge**
5. 내 컴퓨터 정리

```bash
git checkout main
git pull
git branch -D feat/rps-game
```

### 작업 중 main이 바뀌었을 때

```bash
git checkout main
git pull
git checkout feat/rps-game
git merge main
```

충돌이 나면 `<<<<<<<` ~ `>>>>>>>` 부분에서 남길 코드만 남기고 아래를 실행한다.

```bash
git add .
git commit -m "chore: main 변경 반영"
git push
```

### 출품 (대회·DevDay 1주 전)

1. 담당 1명이 `main`에서 `release/capstone` 브랜치를 만들어 푸시한다. (DevDay는 `release/devday`)
2. 출품본 버그는 `release/capstone`에서 `fix/` 브랜치를 만들고, PR의 base를 `release/capstone`으로 지정한다.
3. 새 기능은 계속 `main`에서 작업한다.
4. 행사가 끝나면 `release/capstone` → `main` PR로 수정 사항을 반영한다.
