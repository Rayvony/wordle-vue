<script setup lang="ts">
import { onUnmounted, ref, computed, reactive } from 'vue'
import { getWordOfTheDay, allWords } from './words'
import Keyboard from './Keyboard.vue'
import { LetterState } from './types'

const answer = getWordOfTheDay()

const board = ref(
  Array.from({ length: 6 }, () =>
    Array.from({ length: 5 }, () => ({
      letter: '',
      state: LetterState.INITIAL
    }))
  )
)

const currentRowIndex = ref(0)
const currentRow = computed(() => board.value[currentRowIndex.value])

let message = ref('')
let grid = ref('')
let shakeRowIndex = ref(-1)
let success = ref(false)

const letterStates = reactive<Record<string, LetterState>>({});

let allowInput = true

const onKeyup = (e: KeyboardEvent) => onKey(e.key)

window.addEventListener('keyup', onKeyup)

onUnmounted(() => {
  window.removeEventListener('keyup', onKeyup)
})

function onKey(key: string) {
  if (!allowInput) return
  if (/^[a-zA-Z]$/.test(key)) {
    fillTile(key.toLowerCase())
  } else if (key === 'Backspace') {
    clearTile()
  } else if (key === 'Enter') {
    completeRow()
  }
}

function fillTile(letter: string) {
  for (const tile of currentRow.value) {
    if (!tile.letter) {
      tile.letter = letter
      break
    }
  }
}

function clearTile() {
  for (const tile of [...currentRow.value].reverse()) {
    if (tile.letter) {
      tile.letter = ''
      break
    }
  }
}

function completeRow() {
  if (currentRow.value.every((tile) => tile.letter)) {
    const guess = currentRow.value.map((tile) => tile.letter).join('')
    if (!allWords.includes(guess) && guess !== answer) {
      shake()
      showMessage(`Not in word list`)
      return
    }

    const answerLetters: (string | null)[] = answer.split('')
    currentRow.value.forEach((tile, i) => {
      if (answerLetters[i] === tile.letter) {
        tile.state = letterStates[tile.letter] = LetterState.CORRECT
        answerLetters[i] = null
      }
    })
    // second pass: mark the present
    currentRow.value.forEach((tile) => {
      if (!tile.state && answerLetters.includes(tile.letter)) {
        tile.state = LetterState.PRESENT
        answerLetters[answerLetters.indexOf(tile.letter)] = null
        if (!letterStates[tile.letter]) {
          letterStates[tile.letter] = LetterState.PRESENT
        }
      }
    })
    // 3rd pass: mark absent
    currentRow.value.forEach((tile) => {
      if (!tile.state) {
        tile.state = LetterState.ABSENT
        if (!letterStates[tile.letter]) {
          letterStates[tile.letter] = LetterState.ABSENT
        }
      }
    })

    allowInput = false
    if (currentRow.value.every((tile) => tile.state === LetterState.CORRECT)) {
      // success!
      setTimeout(() => {
        grid.value = genResultGrid()
        showMessage(
          ['Genius', 'Magnificent', 'Impressive', 'Splendid', 'Great', 'Phew'][
            currentRowIndex.value
          ],
          -1
        )
        success.value = true
      }, 1600)
    } else if (currentRowIndex.value < board.value.length - 1) {
      // go the next row
      currentRowIndex.value++
      setTimeout(() => {
        allowInput = true
      }, 1600)
    } else {
      // game over :(
      setTimeout(() => {
        showMessage(answer.toUpperCase(), -1)
      }, 1600)
    }
  } else {
    shake()
    showMessage('Not enough letters')
  }
}

function showMessage(msg: string, time = 1000) {
  message.value = msg
  if (time > 0) {
    setTimeout(() => {
      message.value = ''
    }, time)
  }
}

function shake() {
  shakeRowIndex.value = currentRowIndex.value
  setTimeout(() => {
    shakeRowIndex.value = -1
  }, 1000)
}

const icons = {
  [LetterState.CORRECT]: '🟩',
  [LetterState.PRESENT]: '🟨',
  [LetterState.ABSENT]: '⬜',
  [LetterState.INITIAL]: null
}

function genResultGrid() {
  return board.value
    .slice(0, currentRowIndex.value + 1)
    .map((row) => {
      return row.map((tile) => icons[tile.state]).join('')
    })
    .join('\n')
}

let isNightMode = ref(false);

const toggleTheme = () => {
  document.body.classList.toggle('light-theme');
  isNightMode.value = !isNightMode.value;

  // add class to instantly change all buttons
  const buttons = document.querySelectorAll('button');
  buttons.forEach(button => {
    button.classList.add('instant-transition');
  });

  // remove class to instantly change all buttons
  setTimeout(() => {
    buttons.forEach(button => {
      button.classList.remove('instant-transition');
    });
  }, 100);
};
</script>

<template>
  <Transition>
    <div class="message" v-if="message">
      {{ message }}
      <pre v-if="grid">{{ grid }}</pre>
    </div>
  </Transition>
  <header>
    <h1>Wordle</h1>
        <span @click="toggleTheme" class="material-symbols-sharp">
      {{ isNightMode ? 'clear_night' : 'brightness_5' }}
    </span>
  </header>
  <div id="board">
    <div
      v-for="(row, index) in board"
      :class="[
        'row',
        shakeRowIndex === index && 'shake',
        success && currentRowIndex === index && 'jump'
      ]"
    >
      <div
        v-for="(tile, index) in row"
        :class="['tile', tile.letter && 'filled', tile.state && 'revealed']"
      >
        <div class="front" :style="{ transitionDelay: `${index * 300}ms` }">
          {{ tile.letter }}
        </div>
        <div
          :class="['back', tile.state]"
          :style="{
            transitionDelay: `${index * 300}ms`,
            animationDelay: `${index * 100}ms`
          }"
        >
          {{ tile.letter }}
        </div>
      </div>
    </div>
  </div>
  <Keyboard @key="onKey" :letter-states="letterStates" />
</template>

<style scoped>
#board {
  display: grid;
  grid-template-rows: repeat(6, 1fr);
  grid-gap: 5px;
  padding: 10px;
  box-sizing: border-box;
  --height: min(420px, calc(var(--vh, 100vh) - 310px));
  height: var(--height);
  width: min(350px, calc(var(--height) / 6 * 5));
  margin: 0px auto;
}
.message {
  position: absolute;
  left: 50%;
  top: 80px;
  color: #fff;
  background-color: rgba(0, 0, 0, 0.85);
  padding: 16px 20px;
  z-index: 2;
  border-radius: 4px;
  transform: translateX(-50%);
  transition: opacity 0.3s ease-out;
  font-weight: 600;
}
.message.v-leave-to {
  opacity: 0;
}
.row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  grid-gap: 5px;
}
.tile {
  width: 100%;
  font-size: 2rem;
  line-height: 2rem;
  font-weight: bold;
  vertical-align: middle;
  text-transform: uppercase;
  user-select: none;
  position: relative;
}
.tile.filled {
  animation: zoom 0.2s;
}
.tile .front,
.tile .back {
  color:white;
  box-sizing: border-box;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transition: transform 0.6s;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
.tile .front {
  border: 1.9px solid #3a3a3c;
}
.tile.filled .front {
  border-color: #999;
}

.light-theme .tile.filled .front {
  border: 1.9px solid #3a3a3c;
  color: black;
}
.tile .back {
  transform: rotateX(180deg);
}
.tile.revealed .front {
  transform: rotateX(180deg);
}
.tile.revealed .back {
  transform: rotateX(0deg);
}

header{
  display: flex;
  align-items: center;
  justify-content: center;
}
.material-symbols-sharp{
  position: fixed;
  left: 90%; 
  cursor: pointer;
  color: white;
  font-size: 2rem;
  user-select: none;
  transition: all 0.1s;
}

.material-symbols-sharp:hover{
  opacity: 0.5;
}

.light-theme .material-symbols-sharp{
  color: black; 
  font-size: 2rem;
}


@keyframes zoom {
  0% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

.shake {
  animation: shake 0.5s;
}

@keyframes shake {
  0% {
    transform: translate(1px);
  }
  10% {
    transform: translate(-2px);
  }
  20% {
    transform: translate(2px);
  }
  30% {
    transform: translate(-2px);
  }
  40% {
    transform: translate(2px);
  }
  50% {
    transform: translate(-2px);
  }
  60% {
    transform: translate(2px);
  }
  70% {
    transform: translate(-2px);
  }
  80% {
    transform: translate(2px);
  }
  90% {
    transform: translate(-2px);
  }
  100% {
    transform: translate(1px);
  }
}

.jump .tile .back {
  animation: jump 0.5s;
}

@keyframes jump {
  0% {
    transform: translateY(0px);
  }
  20% {
    transform: translateY(5px);
  }
  60% {
    transform: translateY(-25px);
  }
  90% {
    transform: translateY(3px);
  }
  100% {
    transform: translateY(0px);
  }
}

@media (max-height: 680px) {
  .tile {
    font-size: 3vh;
  }
}
</style>