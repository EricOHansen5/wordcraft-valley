/* Wordcraft Valley: the fixed sentences and the daily quests.
   SIGNS       the story sentences, {t: level, s: sentence}: the valley's signs, the Story crate, the buildings' and
               upgrades' sentences and the Grown-up practice list. Every word must pass Decode.check at level t.
   QUEST_POOL  the daily quests (7c. DAILY QUESTS in index.html): ic its icon, t what it says, k what Quests.hit(k)
               counts, n how many finish it.
   Loaded before the game script (the <script src> tags in index.html), and in sw.js's SHELL list for offline play.
   Plain data only, and ASCII only: anything else is written as \uXXXX. tests/page.js inlines it for the jsdom suites. */
"use strict";window.WCV=window.WCV||{};
WCV.sentences={
SIGNS:[{t:1,s:"The cat sat on a log."},{t:1,s:"A dog can dig."},{t:1,s:"The fox ran to the box."},
  {t:2,s:"The pig is in the mud."},{t:2,s:"A bug got on my cup."},{t:2,s:"The hen sat on an egg."},
  {t:3,s:"The fish is in the ship."},{t:3,s:"A duck can chop a log."},{t:3,s:"The chick ran to the shell."},
  {t:4,s:"The frog sat on a stone."},{t:4,s:"A crab hid in the grass."},{t:4,s:"The truck has a red flag."},
  {t:1,s:"The cab had a map."},{t:1,s:"A van can zip."},
  {t:2,s:"The bus is big and red."},{t:2,s:"A jet can get up."},
  {t:4,s:"The truck is stuck in the mud."},{t:4,s:"The rocket went up fast."},
  {t:5,s:"The train went up the hill."},{t:5,s:"I can ride my bike to the lake."},
  {t:6,s:"A bird sat on the barn."},{t:6,s:"The girl has a red shirt."},{t:6,s:"The shark is in the dark."},
  {t:7,s:"The goat ate a green leaf."},{t:7,s:"We see the moon at night."},{t:7,s:"A cow is in the rain."},
  {t:8,s:"The robot had a picnic at sunset."},{t:8,s:"My rabbit hid in the pumpkin."},{t:8,s:"A turtle ate my sandwich!"},{t:5,s:"The cake is by the gate."},{t:5,s:"A dog dug up a bone."}],
QUEST_POOL:[
  {id:"read5",  ic:"\ud83d\udce6", t:"Open 5 crates",            k:"read",   n:5},
  {id:"read8",  ic:"\ud83d\udcda", t:"Read 8 words",              k:"read",   n:8},
  {id:"master", ic:"\u2b50", t:"Master a word",             k:"master", n:1},
  {id:"streak3",ic:"\ud83d\udd25", t:"Get 3 in a row",            k:"streak3",n:1},
  {id:"sign",   ic:"\ud83e\udea7", t:"Read a story sign",         k:"sign",   n:1},
  {id:"feed",   ic:"\ud83c\udf3e", t:"Feed the animals",          k:"feed",   n:1},
  {id:"use3",   ic:"\ud83d\udece\ufe0f", t:"Use 3 buildings",           k:"use",    n:3},
  {id:"build",  ic:"\ud83c\udfd7\ufe0f", t:"Build something new",       k:"build",  n:1},
  {id:"name3",  ic:"\ud83d\udc3e", t:"Tap 3 animals to hear their names", k:"name", n:3},
  {id:"story",  ic:"\ud83d\udd25", t:"Hear a campfire story",     k:"story",  n:1},
  {id:"drive",  ic:"\ud83d\ude97", t:"Tap 3 vehicles",            k:"vehicle",n:3},
  {id:"order2", ic:"\ud83c\udfea", t:"Serve 2 customers at your shop", k:"order", n:2},
  {id:"dig20",  ic:"\u26cf\ufe0f", t:"Dig 20 blocks in the mine",    k:"dig",   n:20},
  {id:"bubble3",ic:"\ud83d\udcac", t:"Read 3 word bubbles",       k:"bubble", n:3},
  {id:"book1",  ic:"\ud83d\udcda", t:"Read a storybook",          k:"book",   n:1},
  {id:"wild1",  ic:"\ud83c\udf3f", t:"Make a wild animal your friend", k:"wild", n:1},
  {id:"hunt1",  ic:"\ud83d\uddfa\ufe0f", t:"Find a buried treasure",    k:"treasure",n:1},
  {id:"care3",  ic:"\ud83c\udf53", t:"Feed 3 animals in Adventure", k:"care",  n:3},
  {id:"race1",  ic:"\ud83c\udfc1", t:"Win a race",                k:"race",   n:1},
  {id:"write1", ic:"\u270d\ufe0f", t:"Write a word",              k:"write",  n:1},
  {id:"poke5",  ic:"\ud83d\udd0d", t:"Find 5 surprises in trees, rocks and flowers", k:"poke", n:5},
  {id:"newveh", ic:"\ud83d\udd11", t:"Get a new vehicle",         k:"newveh", n:1},
  {id:"upgrade",ic:"\u2b06\ufe0f", t:"Upgrade something",         k:"upgrade",n:1}
]
};
