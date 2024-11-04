import './App.css';
import CharacterCreator from './CharacterCreator';

function App() {
  return (
    <div>
      <div className="flex container justified">
        <h1>Creador de Personajes</h1> 
      </div>
      <div className="flex justified">
        <CharacterCreator />
        <div className="box container" >
          <h1>Hoja de Personaje</h1>   
          <p>Esta es una hoja de personaje</p>
        </div>
    </div>
    </div>
  );
}

export default App;
