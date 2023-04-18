---
title: Age of Humanity
---

# Raldamain

<html>

<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
* {
  box-sizing: border-box;
}

body {
  background-color: #474e5d;
  font-family: Helvetica, sans-serif;
}

/* The actual timeline (the vertical ruler) */
.timeline {
  position: relative;
  max-width: 1200px;
  margin: 0 auto;
}

/* The actual timeline (the vertical ruler) */
.timeline::after {
  content: '';
  position: absolute;
  width: 6px;
  background-color: white;
  top: 0;
  bottom: 0;
  left: 50%;
  margin-left: -3px;
}

/* Container around content */
.container {
  padding: 10px 40px;
  position: relative;
  background-color: inherit;
  width: 50%;
}

/* The circles on the timeline */
.container::after {
  content: '';
  position: absolute;
  width: 25px;
  height: 25px;
  right: -17px;
  background-color: white;
  border: 4px solid #FF9F55;
  top: 15px;
  border-radius: 50%;
  z-index: 1;
}

/* Place the container to the left */
.left {
  left: 0;
}

/* Place the container to the right */
.right {
  left: 50%;
}

/* Add arrows to the left container (pointing right) */
.left::before {
  content: " ";
  height: 0;
  position: absolute;
  top: 22px;
  width: 0;
  z-index: 1;
  right: 30px;
  border: medium solid white;
  border-width: 10px 0 10px 10px;
  border-color: transparent transparent transparent white;
}

/* Add arrows to the right container (pointing left) */
.right::before {
  content: " ";
  height: 0;
  position: absolute;
  top: 22px;
  width: 0;
  z-index: 1;
  left: 30px;
  border: medium solid white;
  border-width: 10px 10px 10px 0;
  border-color: transparent white transparent transparent;
}

/* Fix the circle for containers on the right side */
.right::after {
  left: -16px;
}

/* The actual content */
.content {
  padding: 20px 30px;
  background-color: white;
  position: relative;
  border-radius: 6px;
}

/* Media queries - Responsive timeline on screens less than 600px wide */
@media screen and (max-width: 600px) {
  /* Place the timelime to the left */
  .timeline::after {
  left: 31px;
  }

  /* Full-width containers */
  .container {
  width: 100%;
  padding-left: 70px;
  padding-right: 25px;
  }

  /* Make sure that all arrows are pointing leftwards */
  .container::before {
  left: 60px;
  border: medium solid white;
  border-width: 10px 10px 10px 0;
  border-color: transparent white transparent transparent;
  }

  /* Make sure all circles are at the same spot */
  .left::after, .right::after {
  left: 15px;
  }

  /* Make all right containers behave like the left ones */
  .right {
  left: 0%;
  }
}
</style>
</head>
<body>

<div class="timeline">
  <div class="container left">
    <div class="content">
      <h2>1</h2>
      <p>Feyn begins travelling the world to spread his message. He gains many followers and disciples.</p>
    </div>
  </div>
  <div class="container right">
    <div class="content">
      <h2>48</h2>
      <p>Strakian colonists found the city of Melkhart.</p>
    </div>
  </div>
  <div class="container left">
    <div class="content">
      <h2>89</h2>
      <p>Feyn settles down and together with his followers he creates the first Feynist city.</p>
    </div>
  </div>
  <div class="container right">
    <div class="content">
      <h2>92</h2>
      <p>Feyn has three children with the mortal woman Serah. They are Arathar, Elnatan and Misreya.</p>
    </div>
  </div>
  <div class="container left">
    <div class="content">
      <h2>141</h2>
      <p>Serah tragically dies, filling Feyn with grief. Due to the underworld remaining unclaimed her soul is lost forever.</p>
    </div>
  </div>
  <div class="container right">
    <div class="content">
      <h2>141</h2>
      <p>Feyn leaves his children to take responsibility as god of the world. He chooses Arathar as his successor and Misreya as his first High Priestess. He grants Elnatan the Infinite cube, a great artifact from Syd's time.</p>
    </div>
  </div>
</div>

</body>
</html>

</div>


# Raldamain

| Year | Event                                                        |
| ---- | ------------------------------------------------------------ |
| 1    | Feyn begins travelling the world to spread his message. He gains many followers and disciples. |
|      | Strakian colonists found the city of Melkhart                |
|      | Feyn settles down and together with his followers he creates the first Feynist city. |
|      | Feyn has three children with the mortal woman Serah. They are Arathar, Elnatan and Misreya. |
| 141  | Serah tragically dies, filling Feyn with grief. Due to the underworld remaining unclaimed her soul is lost forever. |
|      | Feyn leaves his children to take responsibility as god of the world. He chooses Arathar as his successor and Misreya as his first High Priestess. He grants Elnatan the Infinite cube, a great artifact from Syd's time. |
|      | Elnatan travels to the elven lands and begins a long friendship with them. Together they begin to plan a flying city. |
|      | The Feynist kingdom fights against northern barbarians that worship the abyssal demigod Tomororon. |
|      | Tomororon and Arathar fight in single combat. Arathar dies gloriously in battle but forces his foe back into the Abyssal realm, inflicting grievous wounds that he will remember forever. |
|      | Elnatan disappears mysteriously after experimenting with the Infinite cube. While his project for a flying city remains unfinished his descendants will continue his work. |
|      | Arathar's eldest son Tarek ascends to the throne after his father's death. |
|      | Misreya dies of old age. Tensions between the kingdom's three great families begin to grow. |
|      | Feyn's grandchildren fight a destructive civil war as the three families fight over control over the kingdom. |
|      | Feyn's great-grandson Talmandas leads a popular revolt to overthrow the monarchy. He is blessed by Feyn to succeed. |
|      | Talmandas founds the Feynist Republic, the first of its kind in history. |
|      | The Feynist Republic begins a period of expansion and economic growth |
|      | The Flying city is finished and takes to the skies powered by the Infinite cube. |
|      | A great war breaks out between the Feynist Republic and the Melkhartian theocracy. |
|      | Melkhart is destroyed in a daring assault by Feynist forces led by the hero Dekelion the bold. The war ends and the Melkhartian state collapses. |
|      | The Feynist Republic begins to grow inefficient and corrupt. Populist leader Galen rises to power and becomes an authoritarian ruler. |
|      | Galen is killed in a violent coup and the Republic falls to civil war. |
|      | The civil war ends after general Velyrian, a chosen of Feyn, takes absolute power and declares himself Emperor of Humanity. The Feynist Republic transforms into the First Empire of Humanity |
|      | Velyrian is assassinated by his general Tivilus, who named himself the next emperor. |
|      | Tivilus begins a reign of terror, executing many enemies both real and imagined. |
|      | The emperor begins breeding a race of magically-enhanced super soldiers to act as his bodyguards. These will be the ancestors of the Chothgar. |
|      | Tivilus dies in mysterious circumstances, a very joyful event which was seen as divine justice. |
|      |                                                              |
|      | War breaks out between the First Empire and the Urlok over valuable resources in their lands. More Chothgar are bred by the empire to fight the Urlok, but the conflict drags on for years without a conclusive end. |
|      |                                                              |
|      | The Tangarin horde migrates in large numbers into Raldamain, invading the lands of the First empire. |
|      | The Tangarin son of heaven is slain by the high priest of Feyn. The Tangarin horde is defeated and flees to the Abyssal rift. |
| 2170 | The First Empire sends a great expedition led by the emperor's son Alithei to the Abyssal rift to eliminate the surviving Tangarines. |
| 2171 | Many Imperial forts and trading posts are built by the empire as they expand into the lands of Pradjati. Alithei finds the legendary sword Dramako Kinara. |
| 2171 | The expeditionary army builds a fortress to guard the Abyssal rift. It will later become the Citadel. |
| 2172 | Emperor x dies and the high priest proclaims himself as the new emperor, usurping the throne. A civil war breaks out between supporters of Alithei and the high priest. |
| 2176 | Alithei wins the war and crowns himself as the new emperor. He starts a cult of personality centered around himself. |
| 2195 | The emperor begins to hate Feyn as he grows old, seeing him as unworthy to be god of Humanity. Persecution increases against the Feynist church. |
| 2207 | Alithei takes the Infinite cube from the capital city, sinking it into the ground. He then declares war on Feyn, leading his Chothgar army into Feyn's divine realm. |
| 2207 | Feyn defeats Alithei and as punishment banishes him and his army into the far north, sentencing them to live the rest of their existence as undead. Alithei will forever be known to history as Tenebrius the traitor. |
| 2208 | As punishment for the emperor's rebellion Feyn unleashes his wrath on the First Empire, causing its flying cities to fall from the skies and its lands become overrun by barbarians. The Age of Humanity comes to a tragic end. |

