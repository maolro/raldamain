import React from 'react';

function BasicInfoTab({ character, setCharacter }) {
  const updateField = (field, value) => {
    setCharacter((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div>
      <h3>Basic Info</h3>
      <label>Name: </label>
      <input
        type="text"
        value={character.name}
        onChange={(e) => updateField('name', e.target.value)}
      />
      <br />
      <label>Age: </label>
      <input
        type="number"
        value={character.age}
        onChange={(e) => updateField('age', e.target.value)}
      />
      <br />
      <label>Race: </label>
      <input
        type="text"
        value={character.race}
        onChange={(e) => updateField('race', e.target.value)}
      />
      <br />
      <label>Class: </label>
      <input
        type="text"
        value={character.class}
        onChange={(e) => updateField('class', e.target.value)}
      />
    </div>
  );
}

export default BasicInfoTab;
