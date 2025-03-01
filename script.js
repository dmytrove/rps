const choices = {
    rock: '🗿',
    paper: '📰',
    scissors: '✂️'
};

// ...existing code...

function makeChoice(playerChoice) {
    // ...existing code...
    let resultMessage = '';
    if (winner === 'player') {
        resultMessage = `You win! ${choices[playerChoice]} beats ${choices[computerChoice]}`;
    } else if (winner === 'computer') {
        resultMessage = `Computer wins! ${choices[computerChoice]} beats ${choices[playerChoice]}`;
    } else {
        resultMessage = `It's a tie! Both chose ${choices[playerChoice]}`;
    }
    
    document.getElementById('result').textContent = resultMessage;
    // Announce result using text-to-speech
    speak(resultMessage);
}

function speak(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
    }
}
