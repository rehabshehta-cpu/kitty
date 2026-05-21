/**
 * Kitty Learn — Personalized Learning data store (localStorage)
 */
(function () {
  "use strict";

  var STORAGE_KEY = "kittyLearn_personal_v1";

  function uid() {
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
  }

  function defaultData() {
    return { version: 1, activeChildId: null, children: [] };
  }

  function loadRaw() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultData();
      var d = JSON.parse(raw);
      d.children = d.children || [];
      return migrateData(Object.assign(defaultData(), d));
    } catch (e) {
      return defaultData();
    }
  }

  function migrateData(data) {
    (data.children || []).forEach(function (child) {
      (child.packs || []).forEach(function (pack) {
        (pack.words || []).forEach(function (w) {
          if (!w.audio && w.id) w.audio = "data/audio/personal/ar/" + w.id + ".wav";
        });
      });
    });
    return data;
  }

  function saveRaw(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function findChild(data, childId) {
    for (var i = 0; i < data.children.length; i++) {
      if (data.children[i].id === childId) return data.children[i];
    }
    return null;
  }

  function findPack(child, packId) {
    if (!child || !child.packs) return null;
    for (var i = 0; i < child.packs.length; i++) {
      if (child.packs[i].id === packId) return child.packs[i];
    }
    return null;
  }

  function findWord(pack, wordId) {
    if (!pack || !pack.words) return null;
    for (var i = 0; i < pack.words.length; i++) {
      if (pack.words[i].id === wordId) return pack.words[i];
    }
    return null;
  }

  window.KittyPersonalStore = {
    uid: uid,

    getAll: function () {
      return loadRaw();
    },

    getActiveChild: function () {
      var data = loadRaw();
      if (!data.activeChildId) return null;
      return findChild(data, data.activeChildId);
    },

    setActiveChild: function (childId) {
      var data = loadRaw();
      if (childId && !findChild(data, childId)) return null;
      data.activeChildId = childId || null;
      saveRaw(data);
      return data;
    },

    addChild: function (profile) {
      var data = loadRaw();
      var child = {
        id: uid(),
        name: String(profile.name || "").trim(),
        age: Number(profile.age) || 0,
        focus: profile.focus || "",
        createdAt: Date.now(),
        packs: [],
      };
      if (!child.name) return null;
      data.children.push(child);
      if (!data.activeChildId) data.activeChildId = child.id;
      saveRaw(data);
      return child;
    },

    updateChild: function (childId, patch) {
      var data = loadRaw();
      var child = findChild(data, childId);
      if (!child) return null;
      if (patch.name != null) child.name = String(patch.name).trim();
      if (patch.age != null) child.age = Number(patch.age) || 0;
      if (patch.focus != null) child.focus = patch.focus;
      saveRaw(data);
      return child;
    },

    deleteChild: function (childId) {
      var data = loadRaw();
      data.children = data.children.filter(function (c) {
        return c.id !== childId;
      });
      if (data.activeChildId === childId) {
        data.activeChildId = data.children.length ? data.children[0].id : null;
      }
      saveRaw(data);
      return data;
    },

    addPack: function (childId, packName) {
      var data = loadRaw();
      var child = findChild(data, childId);
      if (!child) return null;
      child.packs = child.packs || [];
      var pack = { id: uid(), name: String(packName || "").trim(), createdAt: Date.now(), words: [] };
      if (!pack.name) return null;
      child.packs.push(pack);
      saveRaw(data);
      return pack;
    },

    updatePack: function (childId, packId, patch) {
      var data = loadRaw();
      var child = findChild(data, childId);
      var pack = findPack(child, packId);
      if (!pack) return null;
      if (patch.name != null) pack.name = String(patch.name).trim();
      saveRaw(data);
      return pack;
    },

    deletePack: function (childId, packId) {
      var data = loadRaw();
      var child = findChild(data, childId);
      if (!child) return null;
      child.packs = (child.packs || []).filter(function (p) {
        return p.id !== packId;
      });
      saveRaw(data);
      return child;
    },

    addWord: function (childId, packId, wordData) {
      var data = loadRaw();
      var child = findChild(data, childId);
      var pack = findPack(child, packId);
      if (!pack) return null;
      pack.words = pack.words || [];
      var wordId = uid();
      var word = {
        id: wordId,
        text: String(wordData.text || "").trim(),
        imageUrl: wordData.imageUrl || "",
        audioUrl: wordData.audioUrl || "",
        audio: "data/audio/personal/ar/" + wordId + ".wav",
        useTts: wordData.useTts !== false,
        favorite: false,
        learnedCount: 0,
        lastPracticed: null,
        createdAt: Date.now(),
      };
      if (!word.text) return null;
      pack.words.push(word);
      saveRaw(data);
      return word;
    },

    updateWord: function (childId, packId, wordId, patch) {
      var data = loadRaw();
      var child = findChild(data, childId);
      var pack = findPack(child, packId);
      var word = findWord(pack, wordId);
      if (!word) return null;
      if (patch.text != null) word.text = String(patch.text).trim();
      if (patch.imageUrl != null) word.imageUrl = patch.imageUrl;
      if (patch.audioUrl != null) word.audioUrl = patch.audioUrl;
      if (patch.useTts != null) word.useTts = !!patch.useTts;
      if (patch.favorite != null) word.favorite = !!patch.favorite;
      saveRaw(data);
      return word;
    },

    deleteWord: function (childId, packId, wordId) {
      var data = loadRaw();
      var child = findChild(data, childId);
      var pack = findPack(child, packId);
      if (!pack) return null;
      pack.words = (pack.words || []).filter(function (w) {
        return w.id !== wordId;
      });
      saveRaw(data);
      return pack;
    },

    recordWordPractice: function (childId, packId, wordId) {
      var data = loadRaw();
      var child = findChild(data, childId);
      var pack = findPack(child, packId);
      var word = findWord(pack, wordId);
      if (!word) return null;
      word.learnedCount = (word.learnedCount || 0) + 1;
      word.lastPracticed = Date.now();
      saveRaw(data);
      return word;
    },

    getPack: function (childId, packId) {
      var child = findChild(loadRaw(), childId);
      return findPack(child, packId);
    },

    getChild: function (childId) {
      return findChild(loadRaw(), childId);
    },
  };
})();
