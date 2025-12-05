import { state } from './main.js';
import { QUIZ_QUESTIONS } from './quizData.js';
import { randInt } from './config.js';
import * as Effects from './effects.js';

// Quiz module handles timer, UI and answers

const quizModal = document.getElementById('quizModal');
const quizQuestionText = document.getElementById('quizQuestionText');
const quizOptionsEl = document.getElementById('quizOptions');
const quizResultEl = document.getElementById('quizResult');
const quizLevelTag = document.getElementById('quizLevelTag');
const quizIndexTag = document.getElementById('quizIndexTag');

export function handleQuizTimer(now, stateRef, questionPool, updateUICallback) {
    if (!stateRef.running) return;
    if (stateRef.quiz.showing) return;

    const elapsedSec = (now - stateRef.quiz.lastTime) / 1000;
    if (elapsedSec >= stateRef.quiz.nextDelaySec) {
        openRandomQuiz(stateRef, questionPool, updateUICallback);
    }
}

function getRandomQuestion() {
    const all = QUIZ_QUESTIONS.filter(q => !state.quiz.usedIds.has(q.id));
    let pool = all;
    if (all.length === 0) {
        state.quiz.usedIds.clear();
        pool = QUIZ_QUESTIONS;
    }
    const q = pool[randInt(0, pool.length - 1)];
    state.quiz.usedIds.add(q.id);
    return q;
}

function openRandomQuiz(stateRef, pool, updateUICallback) {
    const q = getRandomQuestion();
    stateRef.quiz.showing = true;
    stateRef.quiz.lastTime = Date.now();

    quizQuestionText.textContent = `${q.question}`;
    quizLevelTag.textContent = `${q.title}`;
    quizIndexTag.textContent = ``;
    quizResultEl.classList.add('hidden');
    quizResultEl.textContent = '';

    quizOptionsEl.innerHTML = '';
    Object.entries(q.options).forEach(([key, text]) => {
        const btn = document.createElement('button');
        btn.className = 'quiz-option-btn w-full bg-white hover:bg-amber-100 text-gray-800 text-xs md:text-sm font-bold py-1.5 px-3 shadow-sm border border-amber-200 border-b-2 flex items-center justify-start gap-2';
        btn.innerHTML = `<span class=\"text-xs font-black text-amber-700\">${key}.</span><span class=\"flex-1 text-left\">${text}</span>`;
        btn.onclick = () => handleQuizAnswer(q, key, stateRef, updateUICallback);
        quizOptionsEl.appendChild(btn);
    });

    if (quizModal) quizModal.classList.remove('hidden');
}

function handleQuizAnswer(question, chosenKey, stateRef, updateUICallback) {
    if (!stateRef.quiz.showing) return;
    const correct = chosenKey === question.answer;

    stateRef.quiz.answeredCount++;
    if (correct) {
        stateRef.quiz.correctStreak++;
        quizResultEl.classList.remove('hidden');
        quizResultEl.classList.remove('text-red-600');
        quizResultEl.classList.add('text-green-700');
        quizResultEl.textContent = `✅ 回答正確！${question.explanation}`;
        Effects.applyCorrectBuff();
        // play correct answer sound
        try { Effects.playCorrectSfx(); } catch(e){ /* ignore */ }

        if (stateRef.quiz.correctStreak >= 2) {
            Effects.triggerSwordRain();
            stateRef.quiz.correctStreak = 0;
        }
    } else {
        stateRef.quiz.correctStreak = 0;
        quizResultEl.classList.remove('hidden');
        quizResultEl.classList.remove('text-green-700');
        quizResultEl.classList.add('text-red-600');
        quizResultEl.textContent = `❌ 回答錯誤！正確答案是 ${question.answer}。${question.explanation}`;
        Effects.applyWrongPenalty();
        // play wrong answer sound
        try { Effects.playWrongSfx(); } catch(e){ /* ignore */ }
    }

    setTimeout(() => {
        if (quizModal) quizModal.classList.add('hidden');
        stateRef.quiz.showing = false;
        stateRef.quiz.lastTime = Date.now();
        // always show next question after 1.5 seconds
        stateRef.quiz.nextDelaySec = 1.5;
        if (typeof updateUICallback === 'function') updateUICallback();
    }, 1500);
}

export function closeQuizUI() {
    if (quizModal && !quizModal.classList.contains('hidden')) {
        quizModal.classList.add('hidden');
        state.quiz.showing = false;
    }
}