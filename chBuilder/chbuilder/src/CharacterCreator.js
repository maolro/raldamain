import React, { useState } from 'react';
import BasicInfoTab from './Tabs/BasicInfoTab';
import TalentsTab from './Tabs/TalentsTab';
import SkillsTab from './Tabs/SkillsTab';
import EquipmentTab from './Tabs/EquipmentTab';
import SpellsTab from './Tabs/SpellsTab';
import { saveCharacterToFile, loadCharacterFromFile } from './utils/fileHandlers';
import './CharacterCreator.css';

function CharacterCreator() {
  const [character, setCharacter] = useState({
    name: '',
    age: '',
    race: '',
    class: '',
    attributes: {},
    skills: [],
    equipment: [],
    background: '',
  });
  return (
    <div>
        <div className="tab">
            {/* Tab Components */}
            <button class="tablinks" onclick="openCity(event, 'London')">London</button>
            <button class="tablinks" onclick="openCity(event, 'Paris')">Paris</button>
            <button class="tablinks" onclick="openCity(event, 'Tokyo')">Tokyo</button>
        </div>
        <div id="London" class="tabcontent">
            <h3>London</h3>
            <p>London is the capital city of England.</p>
        </div>
        <div id="Paris" class="tabcontent">
            <h3>Paris</h3>
            <p>Paris is the capital city of France.</p>
        </div>
        <div id="Tokyo" class="tabcontent">
            <h3>Tokyo</h3>
            <p>Tokyo is the capital city of Japan.</p>
        </div>
    </div>
  );
}


export default CharacterCreator;
