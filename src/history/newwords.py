# Levels 9-12 (tile notation as in the game: "x:y" shows x, says y; "x:" is silent)
NEW=[
 # 9 — endings: -ing, -ed (the break before the ending is marked)
 dict(w="fishing",p=["f","i","sh","i","ng"],t=9,syl=[3]),dict(w="running",p=["r","u","nn","i","ng"],t=9,syl=[3]),
 dict(w="swimming",p=["s","w","i","mm","i","ng"],t=9,syl=[4]),dict(w="sleeping",p=["s","l","ee","p","i","ng"],t=9,syl=[4]),
 dict(w="camping",p=["c","a","m","p","i","ng"],t=9,syl=[4]),dict(w="surfing",p=["s","ur","f","i","ng"],t=9,syl=[3]),
 dict(w="singing",p=["s","i","ng","i","ng"],t=9,syl=[3]),dict(w="painting",p=["p","ai","n","t","i","ng"],t=9,syl=[4]),
 dict(w="jumped",p=["j","u","m","p","ed:t"],t=9,syl=[4]),dict(w="landed",p=["l","a","n","d","e:i","d"],t=9,syl=[4]),
 dict(w="rested",p=["r","e","s","t","e:i","d"],t=9,syl=[4]),dict(w="wished",p=["w","i","sh","ed:t"],t=9,syl=[3]),
 dict(w="yelled",p=["y","e","ll","ed:d"],t=9,syl=[3]),
 dict(w="there",p=["th:dh","e","re:r"],t=9,tricky=1),dict(w="where",p=["wh","e","re:r"],t=9,tricky=1),dict(w="were",p=["w","ere:er"],t=9,tricky=1),
 # 10 — soft c and g, y as "ee" and "eye"
 dict(w="city",p=["c:s","i","t","y:ee"],t=10,syl=[2]),dict(w="mice",p=["m","i_e","c:s"],t=10),dict(w="ice",p=["i_e","c:s"],t=10),
 dict(w="face",p=["f","a_e","c:s"],t=10),dict(w="rice",p=["r","i_e","c:s"],t=10),dict(w="gem",p=["g:j","e","m"],t=10),
 dict(w="page",p=["p","a_e","g:j"],t=10),dict(w="happy",p=["h","a","pp","y:ee"],t=10,syl=[2]),dict(w="puppy",p=["p","u","pp","y:ee"],t=10,syl=[2]),
 dict(w="bunny",p=["b","u","nn","y:ee"],t=10,syl=[2]),dict(w="candy",p=["c","a","n","d","y:ee"],t=10,syl=[3]),dict(w="baby",p=["b","a:ay","b","y:ee"],t=10,syl=[2]),
 dict(w="fly",p=["f","l","y:eye"],t=10),dict(w="sky",p=["s","k","y:eye"],t=10),dict(w="cry",p=["c","r","y:eye"],t=10),
 dict(w="two",p=["t","wo:oo"],t=10,tricky=1),dict(w="want",p=["w","a:o","n","t"],t=10,tricky=1),
 # 11 — compound words: two words he knows, read one at a time
 dict(w="rainbow",p=["r","ai","n","b","ow"],t=11,syl=[3],comp=1),dict(w="popcorn",p=["p","o","p","c","or","n"],t=11,syl=[3],comp=1),
 dict(w="snowman",p=["s","n","ow","m","a","n"],t=11,syl=[3],comp=1),dict(w="bathtub",p=["b","a","th","t","u","b"],t=11,syl=[3],comp=1),
 dict(w="mailbox",p=["m","ai","l","b","o","x"],t=11,syl=[3],comp=1),dict(w="teapot",p=["t","ea","p","o","t"],t=11,syl=[2],comp=1),
 dict(w="pancake",p=["p","a","n","c","a_e","k"],t=11,syl=[3],comp=1),dict(w="sailboat",p=["s","ai","l","b","oa","t"],t=11,syl=[3],comp=1),
 dict(w="seashell",p=["s","ea","sh","e","ll"],t=11,syl=[2],comp=1),dict(w="sunfish",p=["s","u","n","f","i","sh"],t=11,syl=[3],comp=1),
 dict(w="could",p=["c","ou:oo","l:","d"],t=11,tricky=1),dict(w="would",p=["w","ou:oo","l:","d"],t=11,tricky=1),
 # 12 — silent letters (kn, wr, ph says f, mb) and contractions
 dict(w="knot",p=["kn:n","o","t"],t=12),dict(w="knee",p=["kn:n","ee"],t=12),dict(w="knife",p=["kn:n","i_e","f"],t=12),
 dict(w="write",p=["wr:r","i_e","t"],t=12),dict(w="wrench",p=["wr:r","e","n","ch"],t=12),dict(w="phone",p=["ph:f","o_e","n"],t=12),
 dict(w="lamb",p=["l","a","mb"],t=12),
 dict(w="can't",p=["c","a","n","'t:t"],t=12,tricky=1,contr=1),dict(w="don't",p=["d","o:oh","n","'t:t"],t=12,tricky=1,contr=1),
 dict(w="it's",p=["i","t","'s:s"],t=12,tricky=1,contr=1),dict(w="I'm",p=["I:eye","'m:m"],t=12,tricky=1,contr=1),
]
ART={w:"x_"+w for w in ["fishing","running","swimming","sleeping","camping","surfing","singing","painting","city","mice","ice","rice","gem","page",
  "happy","puppy","bunny","candy","baby","fly","cry","rainbow","popcorn","snowman","bathtub","mailbox","teapot","pancake","seashell","sunfish",
  "knot","knee","knife","write","wrench","phone","lamb"]}
ART["sailboat"]="v_sailboat"
