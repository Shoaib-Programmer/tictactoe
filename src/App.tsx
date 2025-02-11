import React, { useEffect, useState } from "react";

// --- Type Definitions ---
export type Square = "X" | "O" | null;
export type Board = Square[];

// --- Game Logic Functions ---

// Create a new initial board: an array of 9 squares (3x3)
const initialBoard = (): Board => Array(9).fill(null);

// Determine whose turn it is by counting moves (always X goes first).
const getCurrentPlayer = (board: Board): "X" | "O" => {
  const xCount = board.filter((sq) => sq === "X").length;
  const oCount = board.filter((sq) => sq === "O").length;
  return xCount === oCount ? "X" : "O";
};

// Returns an array of indices for all empty squares.
const availableMoves = (board: Board): number[] =>
  board.reduce<number[]>((acc, sq, idx) => {
    if (sq === null) acc.push(idx);
    return acc;
  }, []);

// Returns a new board after applying a move.
const applyMove = (board: Board, move: number, player: "X" | "O"): Board => {
  if (board[move] !== null) {
    throw new Error("Invalid move");
  }
  const newBoard = board.slice();
  newBoard[move] = player;
  return newBoard;
};

// All winning lines (rows, columns, diagonals)
const winningLines: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

// Determines the winner, if any.
const calculateWinner = (board: Board): Square => {
  for (const line of winningLines) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
};

// Returns true if the board is full or someone has won.
const terminal = (board: Board): boolean =>
  calculateWinner(board) !== null || board.every((sq) => sq !== null);

// Utility function: returns 1 if X wins, -1 if O wins, 0 otherwise.
const utility = (board: Board): number => {
  const win = calculateWinner(board);
  if (win === "X") return 1;
  if (win === "O") return -1;
  return 0;
};

// --- Minimax Algorithm with Alpha–Beta Pruning ---

// A type for the result of minimax routines.
type MoveResult = {
  value: number;
  move: number | null;
};

// The maximizing function (for "X") with alpha-beta pruning.
const maxValueAB = (board: Board, alpha: number, beta: number): MoveResult => {
  if (terminal(board)) return { value: utility(board), move: null };

  let v = -Infinity;
  let bestMove: number | null = null;
  for (const move of availableMoves(board)) {
    const nextBoard = applyMove(board, move, "X");
    const { value: minVal } = minValueAB(nextBoard, alpha, beta);
    if (minVal > v) {
      v = minVal;
      bestMove = move;
    }
    alpha = Math.max(alpha, v);
    if (alpha >= beta) break; // Beta cutoff
  }
  return { value: v, move: bestMove };
};

// The minimizing function (for "O") with alpha-beta pruning.
const minValueAB = (board: Board, alpha: number, beta: number): MoveResult => {
  if (terminal(board)) return { value: utility(board), move: null };

  let v = Infinity;
  let bestMove: number | null = null;
  for (const move of availableMoves(board)) {
    const nextBoard = applyMove(board, move, "O");
    const { value: maxVal } = maxValueAB(nextBoard, alpha, beta);
    if (maxVal < v) {
      v = maxVal;
      bestMove = move;
    }
    beta = Math.min(beta, v);
    if (alpha >= beta) break; // Alpha cutoff
  }
  return { value: v, move: bestMove };
};

// Given a board and the current player (either "X" or "O"), returns the best move using alpha-beta pruning.
const minimaxAB = (board: Board, currentPlayer: "X" | "O"): number | null => {
  if (currentPlayer === "X") {
    return maxValueAB(board, -Infinity, Infinity).move;
  } else {
    return minValueAB(board, -Infinity, Infinity).move;
  }
};

// --- React Components ---

// A Square component renders one cell of the board.
interface SquareProps {
  value: Square;
  onClick: () => void;
}

const SquareComponent: React.FC<SquareProps> = ({ value, onClick }) => {
  return (
    <button className="square" onClick={onClick}>
      {value}
    </button>
  );
};

// The Board component handles game state, renders the board, and implements AI moves.
const BoardComponent: React.FC = () => {
  const [board, setBoard] = useState<Board>(initialBoard());
  // humanPlayer is either "X" or "O"; if not set, ask the user.
  const [humanPlayer, setHumanPlayer] = useState<"X" | "O" | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Apply the theme as a class on the body.
  useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  const botPlayer = humanPlayer ? (humanPlayer === "X" ? "O" : "X") : null;
  // Determine whose turn it is based solely on board state.
  const currentPlayer = getCurrentPlayer(board);
  const winner = calculateWinner(board);

  // useEffect to let the AI (bot) make its move.
  useEffect(() => {
    // Only run if the human has chosen a symbol.
    if (!humanPlayer || !botPlayer) return;
    // If game is over or it's not the bot's turn, do nothing.
    if (terminal(board) || currentPlayer !== botPlayer) return;

    // Add a small delay for better UX.
    const timer = setTimeout(() => {
      const bestMove = minimaxAB(board, botPlayer);
      if (bestMove !== null) {
        setBoard((prevBoard) => applyMove(prevBoard, bestMove, botPlayer));
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [board, currentPlayer, botPlayer, humanPlayer]);

  // Handler for human clicks.
  const handleClick = (i: number) => {
    if (
      !humanPlayer ||
      terminal(board) ||
      board[i] !== null ||
      currentPlayer !== humanPlayer
    ) {
      return;
    }
    setBoard(applyMove(board, i, humanPlayer));
  };

  // Status message.
  let status: string;
  if (winner) {
    // Since user never wins, any winner is the bot.
    status = `Winner: ${winner}`;
  } else if (terminal(board)) {
    status = "Draw!";
  } else {
    status = `Next player: ${currentPlayer}`;
  }

  // Reset the board (and allow re-selecting a symbol).
  const restartGame = () => {
    setBoard(initialBoard());
    setHumanPlayer(null);
  };

  return (
    <>
      {/* Theme toggle icon button (always rendered at top-right) */}
      <button className="theme-toggle" onClick={toggleTheme}>
        {theme === "light" ? (
          // When theme is light, show a crescent moon (to switch to dark)
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="icon icon-moon"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            width="24"
            height="24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"
            />
          </svg>
        ) : (
          // When theme is dark, show a sun icon (to switch to light)
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="icon icon-sun"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            width="24"
            height="24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364l-1.414 1.414M7.05 16.95l-1.414 1.414M16.95 16.95l1.414 1.414M7.05 7.05L5.636 5.636"
            />
            <circle
              cx="12"
              cy="12"
              r="5"
              stroke="currentColor"
              strokeWidth={2}
              fill="none"
            />
          </svg>
        )}
      </button>

      {/* Conditionally render side selection or game board */}
      {!humanPlayer ? (
        <div className="choose-side">
          <h2>Choose your side</h2>
          <div className="btn-group">
            <button onClick={() => setHumanPlayer("X")} className="btn-primary">
              Play as X
            </button>
            <button onClick={() => setHumanPlayer("O")} className="btn-primary">
              Play as O
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`container ${
            winner
              ? "winner"
              : terminal(board)
              ? "draw"
              : ""
          }`}
        >
          <div className="status">
            {status} (You are "{humanPlayer}", Bot is "{botPlayer}")
          </div>
          <div className="board">
            <div className="board-row">
              <SquareComponent value={board[0]} onClick={() => handleClick(0)} />
              <SquareComponent value={board[1]} onClick={() => handleClick(1)} />
              <SquareComponent value={board[2]} onClick={() => handleClick(2)} />
            </div>
            <div className="board-row">
              <SquareComponent value={board[3]} onClick={() => handleClick(3)} />
              <SquareComponent value={board[4]} onClick={() => handleClick(4)} />
              <SquareComponent value={board[5]} onClick={() => handleClick(5)} />
            </div>
            <div className="board-row">
              <SquareComponent value={board[6]} onClick={() => handleClick(6)} />
              <SquareComponent value={board[7]} onClick={() => handleClick(7)} />
              <SquareComponent value={board[8]} onClick={() => handleClick(8)} />
            </div>
          </div>
          <button className="btn-primary" onClick={restartGame}>
            Restart Game
          </button>
        </div>
      )}
    </>
  );
};

export default BoardComponent;
