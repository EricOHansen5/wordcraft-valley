/* Wordcraft Valley: Word Dungeons (the DUNGEONS section of index.html plays them).
   types:    each animal's battle type: fire beats leaf, leaf beats water, water beats fire.
   monsters: kind -> {name, type, art (an ART id), hp (hits to win), move, friend (the befriend sentence),
             look (two look-alike names for the name question)}. Names and sentences are readable at the
             level of the dungeon they live in (tests/dungeon_data.js runs Decode.check on them).
   bosses:   id -> {name, type, weak, art, hp, taunt, friendly}.
   list:     the dungeons, in the order they open: {id, name, level, item, boss, start, bossRoom, monsters, rooms}.
             A room is 9 strings of 13 characters (the wall ring included), at a grid place "at":[x,y]; rooms
             next to each other on the grid meet at the door in the middle of their shared edge.
               #  wall              .  floor            @  entrance (first room only)
               D  open door         L  locked door      B  boss door        W  word door
               P  pot               G  bush             O  block            _  plate
               S  crystal switch    R  red barrier      U  blue barrier     C  chest
               ~  water             ^  pit              %  lava             H  hookshot post
               X  cracked wall      T  sign             F  fairy            M  monster start
             chests {"c,r":{item}} (key, bosskey, map, boomerang; no item: 3-5 gems), signs {"c,r":text},
             pots {"c,r":"key"|"heart"|""}, monsters [{kind, path}] in reading order of the M's,
             shutUntil "plate" (the room's other doors stay shut until a block sits on its plate).
   lines:    the fixed lines the dungeon speaks.
   Plain data, ASCII only (anything else as \uXXXX). Loaded before the game script and listed in sw.js's SHELL. */
"use strict";window.WCV=window.WCV||{};
WCV.dungeons={
types:{
  fox:"fire",wolf:"fire",tiger:"fire",lion:"fire",trex:"fire",dragon:"fire",boar:"fire",rhino:"fire",scorpion:"fire",hawk:"fire",eagle:"fire",
  fish:"water",frog:"water",duck:"water",croc:"water",shark:"water",crab:"water",lobster:"water",seal:"water",octopus:"water",dolphin:"water",whale:"water",penguin:"water",
  dog:"leaf",cat:"leaf",hen:"leaf",pig:"leaf",bug:"leaf",bat:"leaf",bear:"leaf",rabbit:"leaf",raccoon:"leaf",mammoth:"leaf",monkey:"leaf",parrot:"leaf",
  sloth:"leaf",snake:"leaf",elephant:"leaf",gorilla:"leaf",lizard:"leaf",sauropod:"leaf"
},
monsters:{
  dot:{name:"Dot",type:"leaf",art:"m_dot",hp:3,move:"Bounce",friend:"Dot can be my pal.",look:["Dop","Tot"]},
  cap:{name:"Cap",type:"leaf",art:"m_cap",hp:3,move:"Spore",friend:"Cap can be my pal.",look:["Cab","Pac"]},
  gob:{name:"Gob",type:"fire",art:"m_gob",hp:3,move:"Bonk",friend:"Gob can be my pal.",look:["Bog","Gab"]},
  fog:{name:"Fog",type:"water",art:"m_fog",hp:3,move:"Chill",friend:"Fog can be my pal.",look:["Hog","Fob"]}
},
bosses:{
  madlog:{name:"Mad Log",type:"leaf",weak:"fire",art:"boss_madlog",hp:8,taunt:"I am Mad Log! Bop! Bop!",friendly:"Oh, I am not mad. I am a pal!"}
},
list:[
  {id:"forest",name:"Forest Temple",level:1,item:"boomerang",boss:"madlog",start:"f0",bossRoom:"fB",monsters:["dot","cap","gob","fog"],rooms:[
    {id:"f0",at:[1,3],grid:[
      "######D######",
      "#...........#",
      "#..T.....PP.#",
      "#...........#",
      "#...........#",
      "#.G.......G.#",
      "#.....@.....#",
      "#...........#",
      "#############"],
     signs:{"3,2":"Ash, bop a pot!"},pots:{"9,2":"","10,2":""}},
    {id:"f1",at:[1,2],grid:[
      "######L######",
      "#.P.......P.#",
      "#...........#",
      "#..M........#",
      "L...........D",
      "#........M..#",
      "#...........#",
      "#.........P.#",
      "######D######"],
     pots:{"2,1":"heart","10,1":"","10,7":""},monsters:[{kind:"dot",path:"wander"},{kind:"cap",path:"wander"}]},
    {id:"f2",at:[2,2],grid:[
      "######D######",
      "#...........#",
      "#.........C.#",
      "#...........#",
      "D....O.._...#",
      "#...........#",
      "#...........#",
      "#...........#",
      "#############"],
     chests:{"10,2":{item:"key"}},shutUntil:"plate"},
    {id:"f3",at:[1,1],grid:[
      "######B######",
      "#...........#",
      "#..T....P...#",
      "#...........#",
      "W...........D",
      "#.......P...#",
      "#...........#",
      "#...........#",
      "######D######"],
     signs:{"3,2":"Bop the top pot."},pots:{"8,2":"key","8,5":""}},
    {id:"f4",at:[0,1],grid:[
      "#############",
      "#...........#",
      "#.C.........#",
      "#...........#",
      "#....M......D",
      "#...........#",
      "#...........#",
      "#...........#",
      "#############"],
     chests:{"2,2":{item:"boomerang"}},monsters:[{kind:"gob",path:"wander"}]},
    {id:"f5",at:[2,1],grid:[
      "#############",
      "#........^^^#",
      "#........^S^#",
      "#........^^^#",
      "D...........#",
      "#.....M.....#",
      "#RR.........#",
      "#CR.........#",
      "######D######"],
     chests:{"1,7":{item:"bosskey"}},switch:"R",monsters:[{kind:"fog",path:"wander"}]},
    {id:"f6",at:[0,2],grid:[
      "#############",
      "#...........#",
      "#.C.........#",
      "#...........#",
      "#...F.......D",
      "#...........#",
      "#...........#",
      "#...........#",
      "#############"],
     chests:{"2,2":{item:"map"}}},
    {id:"fB",at:[1,0],grid:[
      "#############",
      "#...........#",
      "#...........#",
      "#...........#",
      "#...........#",
      "#...........#",
      "#...........#",
      "#...........#",
      "######D######"],
     boss:true}
  ]}
],
lines:{
  tired:"Ash is tired! Back to the entrance.",
  nextTime:"Maybe next time!",
  fireLeaf:"Fire is strong against leaf!",
  leafWater:"Leaf is strong against water!",
  waterFire:"Water is strong against fire!",
  boomerang:"You found the boomerang!",
  key:"You got a key!",
  bossKey:"You got the boss key!",
  map:"You found the map!",
  heart:"A heart!",
  fairy:"The fairy fills your hearts!",
  locked:"It is locked. Find a key!",
  needBossKey:"You need the boss key."
}
};
