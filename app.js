document.getElementById('calculate').addEventListener('click', function() {
    var targetAddress = document.getElementById('targetAddress').value;
    var results = document.getElementById('results');
    var steps = document.querySelectorAll('.result-text');
    var finalScore = document.getElementById('finalScore');

    // Hide the score and results initially
    finalScore.textContent = '';
    finalScore.classList.add('hidden');
    results.classList.remove('hidden');
    steps.forEach(step => step.classList.add('hidden'));

    // Display the steps with a delay
    steps.forEach((step, index) => {
        setTimeout(() => {
            step.classList.remove('hidden');
        }, 500 * (index + 1));
    });

    // Perform the API call
    setTimeout(() => {
        fetch('http://localhost:3000/push-request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ targetAddress: targetAddress }),
        })
        .then(response => response.json())
        .then(data => {
            finalScore.textContent = data.score;
            finalScore.classList.remove('hidden');
            document.getElementById('addressDisplay').textContent += ' ' + targetAddress;
        })
        .catch(error => {
            console.error('Error:', error);
        });
    }, 500 * (steps.length + 1)); // Wait for the last step to show before making the API call
});
