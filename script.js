// Terminal Theme JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Terminal typing effect
    const terminalContent = document.querySelector('.terminal-content');
    if (terminalContent) {
        addTypingEffect();
    }

    // Add terminal cursor animation
    addCursorAnimation();

    // Add terminal interactions
    addTerminalInteractions();

    // Add loading animation
    window.addEventListener('load', function() {
        document.body.classList.add('loaded');
    });
});

function addTypingEffect() {
    const commandLines = document.querySelectorAll('.command-line');
    let delay = 0;
    
    commandLines.forEach((line, index) => {
        const command = line.querySelector('.command');
        if (command) {
            const originalText = command.textContent;
            command.textContent = '';
            
            setTimeout(() => {
                typeText(command, originalText, 50);
            }, delay);
            
            delay += originalText.length * 50 + 1000; // Add delay between commands
        }
    });
}

function typeText(element, text, speed) {
    let i = 0;
    const timer = setInterval(() => {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
        } else {
            clearInterval(timer);
        }
    }, speed);
}

function addCursorAnimation() {
    const lastCommandLine = document.querySelector('.command-line:last-child .command');
    if (lastCommandLine) {
        lastCommandLine.style.animation = 'blink 1s infinite';
    }
}

function addTerminalInteractions() {
    // Add click effects to file listings
    const fileItems = document.querySelectorAll('.file-item .filename');
    fileItems.forEach(item => {
        item.addEventListener('click', function(e) {
            // Add visual feedback
            this.style.textShadow = '0 0 10px var(--terminal-green)';
            setTimeout(() => {
                this.style.textShadow = '';
            }, 200);
        });
    });

    // Add hover effects to skill tags
    const skillTags = document.querySelectorAll('.skill-tag');
    skillTags.forEach(tag => {
        tag.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.05)';
            this.style.boxShadow = '0 0 15px var(--terminal-shadow)';
        });
        
        tag.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
            this.style.boxShadow = '';
        });
    });

    // Add terminal glow effect
    const terminal = document.querySelector('.terminal');
    if (terminal) {
        terminal.addEventListener('mouseenter', function() {
            this.style.boxShadow = '0 0 30px var(--terminal-shadow)';
        });
        
        terminal.addEventListener('mouseleave', function() {
            this.style.boxShadow = '0 0 20px var(--terminal-shadow)';
        });
    }
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Add terminal sound effects (optional)
function playTerminalSound() {
    // Create a simple beep sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
}

// Add keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl+L to clear terminal (if on a terminal page)
    if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        const terminalBody = document.querySelector('.terminal-body');
        if (terminalBody) {
            terminalBody.innerHTML = '<div class="terminal-content"></div>';
        }
    }
    
    // Escape to go back to home
    if (e.key === 'Escape') {
        if (window.location.pathname !== '/index.html' && window.location.pathname !== '/') {
            window.location.href = 'index.html';
        }
    }
});

// Add terminal loading animation
function addTerminalLoadingAnimation() {
    const terminalBody = document.querySelector('.terminal-body');
    if (terminalBody) {
        terminalBody.style.opacity = '0';
        terminalBody.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            terminalBody.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            terminalBody.style.opacity = '1';
            terminalBody.style.transform = 'translateY(0)';
        }, 100);
    }
}

// Initialize terminal loading animation
addTerminalLoadingAnimation();
