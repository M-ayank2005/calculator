import React, { useState, useEffect } from 'react';
import './App.css';
import './index.css';

function App() {
  const [value, setValue] = useState('');

  const handleInput = (input) => {
    if (input === '=') {
      try {
        setValue(eval(value).toString());
      } catch (error) {
        setValue('');
        alert('Invalid input/operation');
      }
    } else if (input === 'AC') {
      setValue('');
    } else if (input === 'DE') {
      setValue(value.slice(0, -1));
    } else {
      setValue(value + input);
    }
  };

  const handleKeyPress = (event) => {
    const allowedKeys = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '+', '-', '*', '/', 'Enter', 'Backspace', 'Delete'];

    if (allowedKeys.includes(event.key)) {
      if (event.key === 'Enter') {
        handleInput('=');
      } else if (event.key === 'Backspace') {
        handleInput('DE');
      } else if (event.key === 'Delete') {
        handleInput('AC');
      } else {
        handleInput(event.key);
      }
    }
  };


  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [value]);

  return (
    <div className="container">
      <div className="calculator">
        <h1 id='cal'>Calculator</h1>
        <form action=''>
          <div className='display'>
            <input type='text' value={value} readOnly />
          </div>
          <div>
            <input type='button' value="AC" onClick={() => handleInput('AC')} />
            <input type='button' value="DE" onClick={() => handleInput('DE')} />
            <input type='button' value="." onClick={(e) => handleInput('.')} />
            <input type='button' value="/" onClick={(e) => handleInput('/')} />
          </div>
          <div>
            <input type='button' value="7" onClick={(e) => handleInput('7')} />
            <input type='button' value="8" onClick={(e) => handleInput('8')} />
            <input type='button' value="9" onClick={(e) => handleInput('9')} />
            <input type='button' value="*" onClick={(e) => handleInput('*')} />
          </div>
          <div>
            <input type="button" value="4" onClick={(e) => handleInput('4')} />
            <input type='button' value="5" onClick={(e) => handleInput('5')} />
            <input type='button' value="6" onClick={(e) => handleInput('6')} />
            <input type='button' value="+" onClick={(e) => handleInput('+')} />
          </div>
          <div>
            <input type="button" value="1" onClick={(e) => handleInput('1')} />
            <input type="button" value="2" onClick={(e) => handleInput('2')} />
            <input type="button" value="3" onClick={(e) => handleInput('3')} />
            <input type="button" value="-" onClick={(e) => handleInput('-')} />
          </div>
          <div>
            <input type='button' value="00" onClick={(e) => handleInput('00')} />
            <input type='button' value="0" onClick={(e) => handleInput('0')} />
            <input type='button' value="=" className='equal' onClick={() => handleInput('=')} />
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;
