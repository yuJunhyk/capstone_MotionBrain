# capstone_MotionBrain
캡스톤디자인 2 진행

## 협업 매뉴얼

### 작업 흐름

```
이슈 만들기 → 브랜치 만들기 → 작업·커밋 → 푸시 → PR → 팀원 1명 확인 → Squash and merge
```

### 브랜치 종류

| 브랜치 | 용도 | 예시 |
|---|---|---|
| `main` | 최종본 (직접 작업 금지) | |
| `feat/` | 고치는 것 말고 나머지 전부 (기능, 이미지·소리, 문서, 설정) | `feat/rps-game`, `feat/cat-sprite` |
| `fix/` | 버그 수정 | `fix/hand-lost` |

- 브랜치 이름: `종류/짧은-설명` (영어 소문자, 단어 사이 `-`)
- 커밋 메시지: `종류: 한 줄 설명` (예: `feat: 가위바위보 결과 화면 추가`, `fix: 손 인식 끊김 수정`)

### 규칙

1. `main`에서 직접 작업하지 않는다.
2. 브랜치는 `feat/` 아니면 `fix/`.
3. PR을 올리고 팀원 1명이 확인한 뒤 합친다.
4. 행사 1주 전부터는 `fix/`만 합친다.
5. 행사가 끝나면 작업을 마친다. 그때의 `main`이 최종본이다.

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
git commit --no-edit
git push
```
