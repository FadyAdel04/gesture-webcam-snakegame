// snake-game.js - Snake Game Module

class SnakeGame {
  constructor(canvasId, width = 400, height = 400) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      console.error(`Canvas with id "${canvasId}" not found`);
      return;
    }
    
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = width;
    this.canvas.height = height;
    
    // Game settings
    this.gridSize = 20;
    this.tileCount = width / this.gridSize;
    
    // Game state
    this.snake = [{ x: 10, y: 10 }];
    this.food = { x: 15, y: 15 };
    this.dx = 0;
    this.dy = 0;
    this.score = 0;
    this.gameRunning = false;
    this.gameOver = false;
    this.gameLoop = null;
    this.countdown = 0;
    this.countdownInterval = null;
    this.gameStarted = false; // Track if countdown finished and game actually started
    
    // Direction queue for smooth control
    this.directionQueue = [];
    this.currentDirection = null;
    
    // Bind methods
    this.update = this.update.bind(this);
    this.draw = this.draw.bind(this);
  }
  
  // Start the game with countdown
  start() {
    if (this.gameRunning) return;
    
    this.gameRunning = true;
    this.gameOver = false;
    this.gameStarted = false;
    this.snake = [{ x: 10, y: 10 }];
    this.food = this.generateFood();
    this.dx = 0;
    this.dy = 0;
    this.score = 0;
    this.directionQueue = [];
    this.currentDirection = null;
    this.countdown = 3;
    
    // Start countdown
    this.countdownInterval = setInterval(() => {
      this.countdown--;
      this.draw();
      
      if (this.countdown <= 0) {
        clearInterval(this.countdownInterval);
        this.countdownInterval = null;
        this.gameStarted = true;
        // Start game loop after countdown
        this.gameLoop = setInterval(() => {
          if (this.gameRunning && !this.gameOver && this.gameStarted) {
            this.update();
            this.draw();
          }
        }, 150); // ~6-7 FPS for smooth gameplay
      }
    }, 1000); // Countdown every second
    
    this.draw();
  }
  
  // Stop the game
  stop() {
    this.gameRunning = false;
    this.gameStarted = false;
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
      this.gameLoop = null;
    }
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }
  
  // Reset the game
  reset() {
    this.stop();
    this.start();
  }
  
  // Handle gesture direction
  handleDirection(direction) {
    if (!this.gameRunning || this.gameOver || !this.gameStarted) return;
    
    // Add to direction queue to prevent rapid direction changes
    if (this.directionQueue.length < 2) {
      this.directionQueue.push(direction);
    }
  }
  
  // Process direction queue
  processDirectionQueue() {
    if (this.directionQueue.length === 0) return;
    
    const direction = this.directionQueue.shift();
    
    // Prevent reversing into itself
    if (this.dx === 0 && this.dy === 0) {
      // Snake is stationary, accept any direction
      this.setDirection(direction);
    } else {
      // Check if direction is opposite to current
      const isOpposite = 
        (direction === 'Up' && this.dy === 1) ||
        (direction === 'Down' && this.dy === -1) ||
        (direction === 'Left' && this.dx === 1) ||
        (direction === 'Right' && this.dx === -1);
      
      if (!isOpposite) {
        this.setDirection(direction);
      }
    }
  }
  
  // Set direction
  setDirection(direction) {
    switch(direction) {
      case 'Up':
        if (this.dy !== 1) { // Prevent reversing
          this.dx = 0;
          this.dy = -1;
        }
        break;
      case 'Down':
        if (this.dy !== -1) {
          this.dx = 0;
          this.dy = 1;
        }
        break;
      case 'Left':
        if (this.dx !== 1) {
          this.dx = -1;
          this.dy = 0;
        }
        break;
      case 'Right':
        if (this.dx !== -1) {
          this.dx = 1;
          this.dy = 0;
        }
        break;
    }
    this.currentDirection = direction;
  }
  
  // Update game state
  update() {
    // Don't update if game hasn't started (still in countdown)
    if (!this.gameStarted) return;
    
    // Process direction queue
    this.processDirectionQueue();
    
    // Don't move if no direction is set
    if (this.dx === 0 && this.dy === 0) return;
    
    // Move snake
    let head = { x: this.snake[0].x + this.dx, y: this.snake[0].y + this.dy };
    
    // Wrap around edges (snake can cross from sides and appear on the other side)
    if (head.x < 0) {
      head.x = this.tileCount - 1; // Wrap to right side
    } else if (head.x >= this.tileCount) {
      head.x = 0; // Wrap to left side
    }
    
    if (head.y < 0) {
      head.y = this.tileCount - 1; // Wrap to bottom
    } else if (head.y >= this.tileCount) {
      head.y = 0; // Wrap to top
    }
    
    // Check self collision (only way to die - snake hits itself)
    for (let i = 1; i < this.snake.length; i++) {
      if (head.x === this.snake[i].x && head.y === this.snake[i].y) {
        this.endGame();
        return;
      }
    }
    
    this.snake.unshift(head);
    
    // Check food collision
    if (head.x === this.food.x && head.y === this.food.y) {
      this.score += 10;
      this.food = this.generateFood();
      this.onScoreUpdate(this.score);
    } else {
      this.snake.pop();
    }
  }
  
  // Draw game
  draw() {
    // Clear canvas
    this.ctx.fillStyle = '#1a1a1a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw grid
    this.drawGrid();
    
    // Draw food
    this.ctx.fillStyle = '#ff5555';
    this.ctx.fillRect(
      this.food.x * this.gridSize + 2,
      this.food.y * this.gridSize + 2,
      this.gridSize - 4,
      this.gridSize - 4
    );
    
    // Draw snake
    this.snake.forEach((segment, index) => {
      if (index === 0) {
        // Head
        this.ctx.fillStyle = '#00ff99';
      } else {
        // Body
        this.ctx.fillStyle = '#00cc7a';
      }
      this.ctx.fillRect(
        segment.x * this.gridSize + 1,
        segment.y * this.gridSize + 1,
        this.gridSize - 2,
        this.gridSize - 2
      );
    });
    
    // Draw score
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '20px Poppins';
    this.ctx.fillText(`Score: ${this.score}`, 10, 30);
    
    // Draw countdown
    if (this.gameRunning && !this.gameStarted && this.countdown > 0) {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      
      this.ctx.fillStyle = '#00ff99';
      this.ctx.font = 'bold 48px Poppins';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(this.countdown.toString(), this.canvas.width / 2, this.canvas.height / 2);
      
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '20px Poppins';
      this.ctx.fillText('Get ready!', this.canvas.width / 2, this.canvas.height / 2 + 40);
      
      this.ctx.textAlign = 'left';
    }
    
    // Draw game over message
    if (this.gameOver) {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      
      this.ctx.fillStyle = '#ff5555';
      this.ctx.font = 'bold 32px Poppins';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('Game Over!', this.canvas.width / 2, this.canvas.height / 2 - 20);
      
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '20px Poppins';
      this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 20);
      
      this.ctx.fillStyle = '#00ff99';
      this.ctx.font = '16px Poppins';
      this.ctx.fillText('Press "Start Game" to play again', this.canvas.width / 2, this.canvas.height / 2 + 50);
      
      this.ctx.textAlign = 'left';
    }
  }
  
  // Draw grid
  drawGrid() {
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.lineWidth = 1;
    
    for (let i = 0; i <= this.tileCount; i++) {
      // Vertical lines
      this.ctx.beginPath();
      this.ctx.moveTo(i * this.gridSize, 0);
      this.ctx.lineTo(i * this.gridSize, this.canvas.height);
      this.ctx.stroke();
      
      // Horizontal lines
      this.ctx.beginPath();
      this.ctx.moveTo(0, i * this.gridSize);
      this.ctx.lineTo(this.canvas.width, i * this.gridSize);
      this.ctx.stroke();
    }
  }
  
  // Generate food at random position
  generateFood() {
    let food;
    do {
      food = {
        x: Math.floor(Math.random() * this.tileCount),
        y: Math.floor(Math.random() * this.tileCount)
      };
    } while (this.snake.some(segment => segment.x === food.x && segment.y === food.y));
    
    return food;
  }
  
  // End game
  endGame() {
    this.gameOver = true;
    this.gameRunning = false;
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
      this.gameLoop = null;
    }
    this.draw();
    if (this.onGameOver) {
      this.onGameOver(this.score);
    }
  }
  
  // Callbacks
  onScoreUpdate(score) {
    // Override in integration
  }
  
  onGameOver(score) {
    // Override in integration
  }
}

