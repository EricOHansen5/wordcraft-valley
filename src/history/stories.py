# Decodable storybooks for Wordcraft Valley.
# Every word must be readable at the book's level: either a word from the game's
# word list at that level or below, a taught tricky word, or a word whose sound
# patterns were all taught by that level (checked by check() below).
# {pet} becomes his pet's name when that word is decodable at the book's level, else "dog".
# Scene items: [art, x%, size, lift%]  art = "ash" (his miner), "pet", a creature id or a picture word.
import json,re,sys
BOOKS=[
 {"id":"cat_hat","t":1,"title":"The Cat and the Hat","bg":"meadow","cover":"cat",
  "pages":[
   ["A cat sat.",[["cat",50,1.1]]],
   ["The cat had a hat.",[["cat",50,1.1],["hat",50,.55,34]]],
   ["A dog ran at the cat.",[["dog",28,1],["cat",72,1]]],
   ["The cat ran and ran.",[["cat",70,1],["hat",30,.6]]],
   ["The hat got on the dog!",[["dog",50,1.1],["hat",52,.55,34]]]],
  "quiz":[{"q":"Who had the hat at the end?","pics":["dog","cat","fox"],"a":"dog"},
          {"q":"Who ran at the cat?","pics":["pig","dog","hen"],"a":"dog"}]},
 {"id":"fox_box","t":1,"title":"The Fox and the Box","bg":"meadow","cover":"fox",
  "pages":[
   ["A fox had a box.",[["fox",35,1],["box",68,1.1]]],
   ["The fox sat on top.",[["box",50,1.1],["fox",50,.7,30]]],
   ["Hop! The box can hop! Hop, hop, hop.",[["box",45,1.1,10],["fox",45,.7,38]]],
   ["Bop! The fox is on the mat.",[["box",68,1.1],["fox",30,.9]]],
   ["A cat sat on the box. Ha, ha!",[["box",60,1.1],["cat",60,.7,30],["fox",25,.9]]]],
  "quiz":[{"q":"What did the fox have?","pics":["box","log","pot"],"a":"box"},
          {"q":"Who sat on the box at the end?","pics":["cat","dog","hen"],"a":"cat"}]},
 {"id":"pig_mud","t":2,"title":"The Pig in the Mud","bg":"farm","cover":"pig",
  "pages":[
   ["A big pig is in the mud.",[["mud",50,1.5],["pig",50,1.1,4]]],
   ["The sun is hot. The pig is hot.",[["sun",80,.7,62],["pig",40,1.1]]],
   ["A hen sat on the pig.",[["pig",50,1.1],["hen",52,.6,28]]],
   ["The pig got up. The hen hit the mud!",[["mud",45,1.5],["hen",45,.6,4],["pig",78,1]]],
   ["Yes! The hen is wet. The pig is not hot.",[["hen",30,.8],["pig",68,1.1]]]],
  "quiz":[{"q":"Did the hen get wet?","yes":True},
          {"q":"Who sat on the pig?","pics":["hen","duck","cat"],"a":"hen"}]},
 {"id":"red_bus","t":2,"title":"The Red Bus","bg":"town","cover":"bus",
  "pages":[
   ["Get on the bus!",[["bus",50,1.4]]],
   ["Ten pigs get on.",[["bus",45,1.4],["pig",82,.6],["pig",90,.6]]],
   ["A hen gets on, and a big cat!",[["bus",45,1.4],["hen",82,.6],["cat",93,.6]]],
   ["The bus can go. It is fun!",[["bus",60,1.4]]],
   ["Bop! The bus hit a rock. Up, up, up go the pigs!",[["bus",40,1.4],["rock",70,.6],["pig",62,.5,50],["pig",78,.5,62]]]],
  "quiz":[{"q":"How many pigs got on the bus?","words":["ten","six","two"],"a":"ten"},
          {"q":"What did the bus hit?","pics":["rock","log","box"],"a":"rock"}]},
 {"id":"ash_fish","t":3,"title":"Ash Gets a Fish","bg":"pond","cover":"fish",
  "pages":[
   ["This is Ash.",[["ash",50,1.2]]],
   ["Ash has a {pet}.",[["ash",38,1.2],["pet",66,.8]]],
   ["Ash and the {pet} sit on the dock.",[["ash",40,1.1],["pet",62,.75]]],
   ["Ash can fish. Can he get a fish?",[["ash",40,1.1],["fish",78,.6,-4]]],
   ["Tug, tug, tug. Ash got a fish!",[["ash",40,1.1],["fish",60,.7,30]]],
   ["The fish is big! Ash and the {pet} did it!",[["ash",35,1.1],["fish",55,.8,24],["pet",75,.75]]]],
  "quiz":[{"q":"What did Ash catch?","pics":["fish","hat","box"],"a":"fish"},
          {"q":"Who went with Ash?","pics":["pet","pig","hen"],"a":"pet"}]},
 {"id":"ash_shop","t":3,"title":"Ash Has a Shop","bg":"shop","cover":"shop",
  "pages":[
   ["Ash has a shop.",[["shop",50,1.5]]],
   ["A hen gets a hat at the shop.",[["ash",30,1],["hen",68,.8],["hat",68,.4,32]]],
   ["A fox gets a big dish.",[["ash",30,1],["fox",66,.9],["dish",66,.5,40]]],
   ["A duck has no cash. No cash!",[["ash",30,1],["duck",68,.9]]],
   ["Ash gets the duck a chip.",[["ash",30,1],["chip",50,.5,30],["duck",70,.9]]],
   ["The duck said, \"Quack!\"",[["ash",30,1],["duck",68,1]]]],
  "quiz":[{"q":"What did the hen get?","pics":["hat","dish","chip"],"a":"hat"},
          {"q":"Did the duck have cash?","yes":False}]},
 {"id":"ash_frog","t":4,"title":"The Frog Jump","bg":"pond","cover":"frog",
  "pages":[
   ["Ash and the {pet} went to the pond.",[["ash",35,1.1],["pet",60,.75]]],
   ["A frog sat on a log.",[["log",55,1.1],["frog",55,.6,20]]],
   ["The frog can jump!",[["frog",55,.7,40]]],
   ["Jump, jump, splash! The frog is in the pond.",[["frog",60,.7,-2]]],
   ["The {pet} jumps in, and Ash grins.",[["ash",30,1.1],["pet",65,.75,-2]]],
   ["The frog swims up to the {pet}. Best pals!",[["pet",45,.8,-2],["frog",65,.6,-2]]]],
  "quiz":[{"q":"Where did the frog sit first?","pics":["log","rock","box"],"a":"log"},
          {"q":"Did the {pet} jump in the pond?","yes":True}]},
 {"id":"big_truck","t":4,"title":"The Big Truck","bg":"town","cover":"truck",
  "pages":[
   ["Ash has a red truck.",[["ash",28,1],["truck",64,1.3]]],
   ["The truck can dump sand.",[["truck",50,1.3]]],
   ["Crash! It hit a stump.",[["truck",45,1.3],["log",75,.6]]],
   ["Ash and a crab help.",[["ash",30,1],["crab",55,.6],["truck",80,1.1]]],
   ["Tug and lift! The truck is up.",[["truck",55,1.3,6],["crab",25,.6]]],
   ["Ash and the crab clap.",[["ash",40,1.1],["crab",66,.7]]]],
  "quiz":[{"q":"Who helped Ash?","pics":["crab","frog","pig"],"a":"crab"},
          {"q":"Did the truck crash?","yes":True}]},
 {"id":"ash_kite","t":5,"title":"The Kite","bg":"meadow","cover":"kite",
  "pages":[
   ["Ash has a kite.",[["ash",40,1.1],["kite",65,.7,40]]],
   ["It is red and white.",[["kite",50,1,30]]],
   ["The wind takes the kite up.",[["ash",30,1],["kite",65,.6,60]]],
   ["Up and up it rides.",[["kite",60,.5,70]]],
   ["No! The kite is stuck in a tree.",[["tree",60,1.6],["kite",60,.4,62]]],
   ["Ash can not get it. The {pet} can!",[["ash",25,1],["tree",62,1.6],["pet",62,.5,40]]],
   ["The {pet} gets the kite. It is time to hug!",[["ash",40,1.1],["pet",58,.75],["kite",75,.5]]]],
  "quiz":[{"q":"Where did the kite get stuck?","pics":["tree","lake","cake"],"a":"tree"},
          {"q":"Who got the kite down?","pics":["pet","hawk","cake"],"a":"pet"}]},
 {"id":"lake_whale","t":5,"title":"The Wave","bg":"sea","cover":"whale",
  "pages":[
   ["Ash rode a bike to the lake.",[["ash",35,1],["bike",60,.9]]],
   ["At the lake, Ash got in a boat.",[["boat",50,1.3,-2],["ash",50,.6,20]]],
   ["The {pet} got in with him.",[["boat",50,1.3,-2],["ash",44,.6,20],["pet",58,.45,20]]],
   ["Then a whale came up!",[["boat",30,1,-2],["whale",70,1.5,-4]]],
   ["The whale made a big wave.",[["whale",70,1.4,-4],["boat",35,1,10]]],
   ["Ash and the {pet} rode the wave home.",[["boat",50,1.2,14],["ash",46,.55,32],["pet",58,.4,32]]]],
  "quiz":[{"q":"What came up by the boat?","pics":["whale","shark","fish"],"a":"whale"},
          {"q":"How did Ash get to the lake?","pics":["bike","car","bus"],"a":"bike"}]},
 {"id":"dark_cave","t":6,"title":"The Dark Cave","bg":"cave","cover":"star",
  "pages":[
   ["Ash and the {pet} dig in the dark.",[["ash",40,1.1],["pet",62,.7]]],
   ["Far in the dark, the rocks are hard.",[["rock",30,.7],["rock",70,.8]]],
   ["Ash spots a spark!",[["ash",30,1],["star",70,.5,40]]],
   ["It is a star in the rock!",[["star",50,.9,20]]],
   ["But a big bat is on the star.",[["star",50,.7],["bat",50,.9,40]]],
   ["Ash hands the bat a corn chip. Crunch!",[["ash",30,1],["corn",50,.5,30],["bat",72,.8,30]]],
   ["The bat lets Ash get the star!",[["ash",40,1.1],["star",62,.6,30],["bat",80,.6,55]]]],
  "quiz":[{"q":"What did Ash find?","pics":["star","moon","fish"],"a":"star"},
          {"q":"What did Ash give the bat?","pics":["corn","cake","fish"],"a":"corn"}]},
 {"id":"farm_horse","t":6,"title":"The Horse and the Bird","bg":"farm","cover":"horse",
  "pages":[
   ["Ash has a horse on the farm.",[["ash",28,1],["horse",62,1.4]]],
   ["The horse is big, and it is strong.",[["horse",50,1.5]]],
   ["It likes to munch corn.",[["horse",45,1.4],["corn",75,.5]]],
   ["A bird sat on the horse.",[["horse",50,1.4],["bird",52,.4,52]]],
   ["The horse let the bird ride!",[["horse",55,1.4],["bird",57,.45,52]]],
   ["The bird and the horse are best pals.",[["horse",40,1.4],["bird",70,.5,30]]]],
  "quiz":[{"q":"What does the horse munch?","pics":["corn","cake","nut"],"a":"corn"},
          {"q":"Who rode on the horse?","pics":["bird","girl","fox"],"a":"bird"}]},
 {"id":"night_sea","t":7,"title":"A Goat in a Coat","bg":"night","cover":"goat",
  "pages":[
   ["At night, Ash and the {pet} go to the sea.",[["ash",35,1],["pet",58,.7]]],
   ["The moon is out. It is so bright.",[["moon",70,.7,62],["ash",30,1]]],
   ["They see a boat with a light.",[["boat",60,1.2,-2],["light",60,.4,30]]],
   ["It is a goat in a coat!",[["boat",55,1.2,-2],["goat",55,.6,22],["coat",78,.4,40]]],
   ["The goat waves, and the boat floats on.",[["boat",75,1,-2],["goat",75,.5,20]]],
   ["Ash and the {pet} wave back. What a treat!",[["ash",40,1.1],["pet",62,.7]]]],
  "quiz":[{"q":"Who was in the boat?","pics":["goat","cow","sheep"],"a":"goat"},
          {"q":"What did the goat have on?","pics":["coat","boot","shirt"],"a":"coat"}]},
 {"id":"rain_book","t":7,"title":"The Rain Day","bg":"rain","cover":"rain",
  "pages":[
   ["Rain, rain! Ash stays in.",[["house",50,1.5]]],
   ["Ash reads a book to the {pet}.",[["ash",38,1.1],["pet",64,.7]]],
   ["The book has a cow in it.",[["cow",50,1.2]]],
   ["The cow meets a mouse.",[["cow",38,1.2],["mouse",70,.5]]],
   ["The mouse needs a home.",[["mouse",50,.7]]],
   ["The mouse gets a room in the barn with the cow.",[["barn",50,1.6],["cow",30,.8],["mouse",70,.4]]],
   ["The rain stops. Ash and the {pet} run out to play!",[["ash",40,1.1],["pet",62,.7]]]],
  "quiz":[{"q":"Who needed a home?","pics":["mouse","cow","goat"],"a":"mouse"},
          {"q":"Did it rain in the story?","yes":True}]},
 {"id":"robot_zip","t":8,"title":"Zip the Robot","bg":"meadow","cover":"robot",
  "pages":[
   ["Ash made a robot. Its name is Zip.",[["ash",35,1],["robot",65,1]]],
   ["Zip can pick up a pumpkin.",[["robot",45,1],["pumpkin",70,.6]]],
   ["Zip can make a sandwich.",[["robot",45,1],["sandwich",70,.5,20]]],
   ["At the picnic, Zip sets out cupcakes.",[["picnic",45,.9],["cupcake",70,.4,20],["robot",20,.8]]],
   ["Then a rabbit hops in and grabs a cupcake!",[["rabbit",55,.7],["cupcake",72,.35,20]]],
   ["Zip beeps. Beep, beep!",[["robot",50,1.1]]],
   ["Ash hands the rabbit a cupcake. Yum!",[["ash",30,1],["cupcake",50,.35,30],["rabbit",70,.7]]]],
  "quiz":[{"q":"What is the robot's name?","words":["Zip","Bolt","Max"],"a":"Zip"},
          {"q":"Who grabbed a cupcake?","pics":["rabbit","turtle","dragon"],"a":"rabbit"}]},
 {"id":"dragon_picnic","t":8,"title":"The Dragon Picnic","bg":"meadow","cover":"dragon",
  "pages":[
   ["A dragon lands in the garden.",[["dragon",60,1.4]]],
   ["Ash and the {pet} run to hide.",[["ash",25,1],["pet",40,.7],["dragon",78,1]]],
   ["But the dragon has a picnic basket.",[["dragon",45,1.2],["picnic",75,.7]]],
   ["In it are hotdogs and lemons.",[["hotdog",40,.6],["lemon",65,.5]]],
   ["The dragon needs a pal.",[["dragon",50,1.3]]],
   ["Ash sits down. They munch and chat till sunset.",[["ash",30,1],["dragon",70,1.1],["sunset",50,.8,55]]]],
  "quiz":[{"q":"Who came to the picnic?","pics":["dragon","turtle","robot"],"a":"dragon"},
          {"q":"When did the picnic end?","pics":["sunset","night","rain"],"a":"sunset"}]},
 # ---------------- level 9: endings -ing, -ed ----------------
 {"id":"ash_fishing","t":9,"title":"Ash Goes Fishing","bg":"pond","cover":"fishing",
  "pages":[["Ash and his {pet} went fishing at the pond.",[["ash",30,1],["pet",55,.7],["fishing",78,.8]]],
   ["Ash sat on a rock. The {pet} was resting.",[["rock",30,.9],["ash",30,.9,30],["pet",68,.7]]],
   ["A big fish jumped up!",[["water",50,1.6,-14],["fish",55,.8,30]]],
   ["Splash! The fish landed in the pond.",[["water",50,1.6,-14],["fish",50,.7]]],
   ["Ash wished and wished. Then he got a fish!",[["ash",35,1],["fish",65,.8]]],
   ["Ash and the {pet} are resting in the sun.",[["ash",35,1],["pet",60,.7],["sun",80,.6,50]]]],
  "quiz":[{"q":"What did Ash do at the pond?","pics":["fishing","camping","swimming"],"a":"fishing"},
          {"q":"Did a fish jump up?","yes":True},
          {"q":"Who was resting with Ash?","pics":["pet","cow","bee"],"a":"pet"}]},
 {"id":"camp_night","t":9,"title":"Camping at Night","bg":"night","cover":"camping",
  "pages":[["Ash and Max went camping.",[["ash",30,1],["camping",68,1]]],
   ["They set up a tent by the pond.",[["tent",45,1.1],["water",80,1,-12]]],
   ["Max was singing, and Ash was painting.",[["singing",30,.8],["painting",70,.8]]],
   ["Then the sun went down. Ash yelled, Look!",[["ash",40,1],["moon",70,.6,50]]],
   ["A bat was zipping past the moon!",[["bat",45,.7,40],["moon",65,.7,52]]],
   ["They went to sleep in the tent. Sleeping in a tent is fun!",[["tent",45,1.1],["sleeping",75,.6,20]]]],
  "quiz":[{"q":"What was Max doing?","pics":["singing","painting","fishing"],"a":"singing"},
          {"q":"What went past the moon?","pics":["bat","bee","bird"],"a":"bat"},
          {"q":"Did they sleep in a house?","yes":False}]},
 # ---------------- level 10: soft c and g, y ----------------
 {"id":"happy_puppy","t":10,"title":"The Happy Puppy","bg":"town","cover":"puppy",
  "pages":[["Ash got a puppy. The puppy is happy.",[["ash",30,1],["puppy",65,.8]]],
   ["The puppy likes to run in the city.",[["city",50,1.4,10],["puppy",60,.7]]],
   ["It sees mice by the gate.",[["gate",40,1],["mice",70,.6]]],
   ["The mice run and hide in a box.",[["box",55,1],["mice",35,.5]]],
   ["The puppy is sad. It starts to cry.",[["puppy",45,.9],["cry",70,.5,40]]],
   ["Ash gives it a snack. Now it is happy!",[["ash",30,1],["puppy",60,.8],["happy",80,.5,45]]]],
  "quiz":[{"q":"What did the puppy see?","pics":["mice","fly","baby"],"a":"mice"},
          {"q":"Where did the mice hide?","pics":["box","cup","hat"],"a":"box"},
          {"q":"Was the puppy happy at the end?","yes":True}]},
 {"id":"rice_shop","t":10,"title":"Rice and Candy","bg":"shop","cover":"rice",
  "pages":[["Ash has a shop in the city.",[["ash",35,1],["shop",68,1.1]]],
   ["A baby bunny comes in.",[["bunny",55,.8]]],
   ["It wants rice and candy.",[["rice",35,.8],["candy",65,.7]]],
   ["Ash gets the rice. Then a fly lands on it!",[["ash",30,1],["rice",60,.7],["fly",62,.4,32]]],
   ["The fly zips up to the sky.",[["fly",55,.5,45],["cloud",35,.8,55]]],
   ["The bunny is happy. It gives Ash a big hug.",[["bunny",60,.8],["ash",35,1]]]],
  "quiz":[{"q":"Who came in to the shop?","pics":["bunny","puppy","baby"],"a":"bunny"},
          {"q":"What did the bunny want?","pics":["rice","cake","fish"],"a":"rice"},
          {"q":"What landed on the rice?","pics":["fly","bee","bird"],"a":"fly"}]},
 # ---------------- level 11: compound words ----------------
 {"id":"snowman","t":11,"title":"The Snowman","bg":"meadow","cover":"snowman",
  "pages":[["It is a cold day. Ash puts on his coat.",[["ash",45,1],["coat",72,.6,20]]],
   ["Ash and his {pet} make a snowman.",[["ash",30,1],["snowman",60,1],["pet",82,.6]]],
   ["The snowman has a teapot for a hat!",[["snowman",50,1.1],["teapot",50,.5,52]]],
   ["Then the sun comes out. A rainbow!",[["rainbow",50,1.4,30],["sun",80,.5,55]]],
   ["Oh no! The snowman is melting.",[["snowman",50,.9],["water",50,1.2,-14]]],
   ["Ash could not stop it, but he had popcorn and fun.",[["ash",35,1],["popcorn",65,.6]]]],
  "quiz":[{"q":"What did the snowman have for a hat?","pics":["teapot","hat","pot"],"a":"teapot"},
          {"q":"What came out with the sun?","pics":["rainbow","moon","fly"],"a":"rainbow"},
          {"q":"Did the snowman melt?","yes":True}]},
 {"id":"sailboat","t":11,"title":"The Sailboat","bg":"sea","cover":"sailboat",
  "pages":[["Ash and Zip set sail in a sailboat.",[["sailboat",50,1.3]]],
   ["They see a sunfish and a seashell.",[["sunfish",35,.7],["seashell",68,.6]]],
   ["Zip gets a pancake from the lunchbox.",[["pancake",50,.8]]],
   ["The wind is strong. The sailboat rocks and rocks.",[["sailboat",50,1.2,6],["cloud",25,.7,55]]],
   ["Then they land on the sand. Would you like to go on a sailboat?",[["sand",50,1.6,-10],["sailboat",75,.8]]]],
  "quiz":[{"q":"What did they see in the sea?","pics":["sunfish","crab","whale"],"a":"sunfish"},
          {"q":"What did Zip eat?","pics":["pancake","cupcake","popcorn"],"a":"pancake"}]},
 # ---------------- level 12: silent letters, contractions ----------------
 {"id":"lost_phone","t":12,"title":"Ash Can't Find the Phone","bg":"town","cover":"phone",
  "pages":[["Oh no! Ash can't find his phone!",[["ash",45,1]]],
   ["Is it by the teapot? No, it is not.",[["teapot",50,.8]]],
   ["Is it in the mailbox? Don't be silly!",[["mailbox",50,1]]],
   ["His {pet} has it. The {pet} is chewing on it!",[["pet",45,.8],["phone",62,.4]]],
   ["Ash gets his phone back. I'm so glad! he said.",[["ash",40,1],["phone",60,.4,30],["happy",78,.5,45]]]],
  "quiz":[{"q":"What did Ash lose?","pics":["phone","knife","wrench"],"a":"phone"},
          {"q":"Was the phone in the mailbox?","yes":False}]},
 {"id":"ash_writes","t":12,"title":"Ash Writes a Book","bg":"meadow","cover":"write",
  "pages":[["Ash wants to write a book.",[["ash",40,1],["write",70,.6]]],
   ["He gets a pen and a page.",[["pen",40,.6],["page",65,.7]]],
   ["He writes about a lamb and a knight.",[["lamb",50,.9]]],
   ["The lamb hurt its knee. The knight fixed it with a wrench!",[["lamb",40,.9],["wrench",70,.5]]],
   ["It's a good book! Ash said.",[["ash",40,1],["page",68,.6]]],
   ["Now it's your turn. Write a book!",[["write",50,.8]]]],
  "quiz":[{"q":"Who hurt a knee?","pics":["lamb","puppy","bunny"],"a":"lamb"},
          {"q":"What did Ash write with?","pics":["pen","phone","knife"],"a":"pen"}]},
]

# ------------------------------------------------------------------ checker
W=json.load(open("/home/claude/work/words.json"))
LIST={x["w"]:x["t"] for x in W}
TRICKY={x["w"]:x["t"] for x in W if x["tricky"]}
# common words every early decodable series allows, and names
EXTRA_TRICKY={"and":1,"has":2,"ha":1,"yes":2,"full":3,"with":3,"him":2,"them":3,"then":3,"this":3,"its":2,"it's":2,
  "Ash":3,"by":3,"about":9,"back":4,"day":7,"make":5,"cold":4,"find":4,"good":7,"your":12,"oh":1,"no":2,"Zip":8,"Bolt":8,"Max":8,"quack":3,"whee":7,"into":3,"there":8,"down":7,"out":7}
DIG=["igh","sh","ch","th","wh","ck","ng","qu","ee","ea","ai","ay","oa","ow","oo","ou","ar","or","er","ir","ur","ll","ss","ff","zz","le"]
TEAM={"ee","ea","ai","ay","oa","ow","oo","ou","igh"};RC={"ar","or","er","ir","ur"};DG={"sh","ch","th","wh","ng","qu","ll","ss","ff","zz"}
V="aeiou"
def tier(w):
    lw=w.lower()
    if w in EXTRA_TRICKY:return EXTRA_TRICKY[w]
    if w.lower() in EXTRA_TRICKY:return EXTRA_TRICKY[w.lower()]
    if lw in LIST:return LIST[lw]
    if lw in TRICKY:return TRICKY[lw]
    base=lw
    # level 12: silent letters and contractions
    if "'" in lw:return 12
    if lw.startswith(("kn","wr","ph")):return max(12,tier(lw[2:]) if len(lw)>3 else 12)
    # level 11: compound words made of two known words
    if len(lw)>=6:
        for k in range(3,len(lw)-2):
            a,b=lw[:k],lw[k:]
            if a in LIST and b in LIST:return max(11,LIST[a],LIST[b])
    # level 9: endings -ing / -ed on a word he can read (run+n+ing, like-e+ing)
    for suf in ["ing","ed"]:
        if lw.endswith(suf) and len(lw)>len(suf)+2:
            st=lw[:-len(suf)]
            for c in [st,st+"e",st[:-1] if len(st)>2 and st[-1]==st[-2] else None]:
                if c and (c in LIST or len(c)>=3):return max(9,tier(c))
    for suf in ["s","es"]:
        if lw.endswith(suf) and lw[:-len(suf)] in LIST:return LIST[lw[:-len(suf)]]
    if lw.endswith("s") and len(lw)>3 and lw[-2]!="s":base=lw[:-1]   # plural or third person: no new sound work
    t=1;g=[];i=0
    # silent e: vowel + one consonant + e at the end
    magic=len(base)>=3 and base[-1]=="e" and base[-2] not in V and base[-3] in V
    if magic:t=max(t,5);base2=base[:-1]
    else:base2=base
    while i<len(base2):
        m=next((d for d in DIG if base2.startswith(d,i) and (d!="le" or i+2==len(base2))),None)
        if m:g.append(m);i+=len(m)
        else:g.append(base2[i]);i+=1
    if re.search(r"c[eiy]|ge$|gy",base2):t=max(t,10)
    if len(base2)>=2 and base2.endswith("y") and base2[-2] not in V:t=max(t,10)
    for x in g:
        if x in TEAM:t=max(t,7)
        elif x in RC:t=max(t,6)
        elif x in DG or x=="ck":t=max(t,3 if x!="ck" else 1)
        elif x=="le":t=max(t,8)
        elif x in "ieu":t=max(t,2)
        elif x=="y":t=max(t,7)
    # consonant clusters (blends), ignoring digraph units
    cons=lambda x:x not in V and x not in TEAM and x not in RC and x!="y"
    for a,b in zip(g,g[1:]):
        if cons(a) and cons(b):t=max(t,4)
    vg=sum(1 for x in g if x in V or x in TEAM or x in RC or x=="y")
    if vg>=2:t=max(t,8)
    return t
def words_of(text):return re.findall(r"[A-Za-z']+",text)
bad=0
for b in BOOKS:
    for pi,(text,_) in enumerate(b["pages"]):
        for w in words_of(text.replace("{pet}","dog")):
            tw=tier(w)
            if tw>b["t"]:print(f"  {b['id']} p{pi+1}: '{w}' needs level {tw} (book is {b['t']})");bad+=1
for b in BOOKS:
    for w in words_of(b["title"]):
        if tier(w)>b["t"]:print(f"  title of {b['id']}: '{w}' needs level {tier(w)}");bad+=1
print("books:",len(BOOKS),"| words above level:",bad)
if "--js" in sys.argv:
    open("/home/claude/work/stories.js","w").write("const BOOKS="+json.dumps(BOOKS,ensure_ascii=False,separators=(",",":"))+";\n")
    print("wrote stories.js")
