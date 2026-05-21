/**
 * Kitty Learn — Multi-child profile store (localStorage, isolated per childId)
 *
 * Registry: kittyLearn_children_registry → { children: [{ id, name, age, ... }] }
 * Session:   kittyLearn_currentChildId → active child id
 * Per child:  kid_xxx → { packs, writingPractice, progress }
 */
(function () {
  "use strict";

  var REGISTRY_KEY = "kittyLearn_children_registry";
  var CURRENT_CHILD_KEY = "kittyLearn_currentChildId";
  var LEGACY_KEY = "kittyLearn_personal_v1";
  var legacyMigrated = false;

  function uid() {
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
  }

  function generateChildId() {
    return "kid_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function defaultChildData() {
    return {
      packs: [],
      writingPractice: { enabled: false, words: [] },
      progress: {
        totalWordsPracticed: 0,
        totalWritingSuccess: 0,
        lastVisit: null,
      },
    };
  }

  function defaultRegistry() {
    return { version: 2, children: [] };
  }

  function loadRegistry() {
    migrateLegacyOnce();
    try {
      var raw = localStorage.getItem(REGISTRY_KEY);
      if (!raw) return defaultRegistry();
      var d = JSON.parse(raw);
      d.children = d.children || [];
      return Object.assign(defaultRegistry(), d);
    } catch (e) {
      return defaultRegistry();
    }
  }

  function saveRegistry(reg) {
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(reg));
  }

  function loadChildData(childId) {
    if (!childId) return null;
    try {
      var raw = localStorage.getItem(childId);
      if (!raw) return null;
      return migrateChildData(JSON.parse(raw));
    } catch (e2) {
      return null;
    }
  }

  function saveChildData(childId, data) {
    if (!childId || !data) return;
    localStorage.setItem(childId, JSON.stringify(data));
  }

  function migrateChildData(data) {
    data = Object.assign(defaultChildData(), data || {});
    data.packs = data.packs || [];
    if (!data.writingPractice) {
      data.writingPractice = { enabled: false, words: [] };
    } else {
      data.writingPractice.words = data.writingPractice.words || [];
      if (data.writingPractice.enabled == null) data.writingPractice.enabled = false;
    }
    data.progress = Object.assign(defaultChildData().progress, data.progress || {});
    data.packs.forEach(function (pack) {
      (pack.words || []).forEach(function (w) {
        if (!w.audio && w.id) w.audio = "data/audio/personal/ar/" + w.id + ".wav";
      });
    });
    return data;
  }

  function migrateLegacyOnce() {
    if (legacyMigrated) return;
    legacyMigrated = true;
    try {
      var raw = localStorage.getItem(LEGACY_KEY);
      if (!raw) return;
      var existing = localStorage.getItem(REGISTRY_KEY);
      if (existing) {
        localStorage.removeItem(LEGACY_KEY);
        return;
      }
      var d = JSON.parse(raw);
      var reg = defaultRegistry();
      var idMap = {};
      (d.children || []).forEach(function (old) {
        var childId =
          old.id && String(old.id).indexOf("kid_") === 0 ? old.id : generateChildId();
        if (old.id) idMap[old.id] = childId;
        reg.children.push({
          id: childId,
          name: old.name || "",
          age: Number(old.age) || 0,
          focus: old.focus || "",
          createdAt: old.createdAt || Date.now(),
        });
        saveChildData(childId, migrateChildData({
          packs: old.packs || [],
          writingPractice: old.writingPractice || { enabled: false, words: [] },
          progress: {},
        }));
      });
      saveRegistry(reg);
      if (d.activeChildId) {
        localStorage.setItem(CURRENT_CHILD_KEY, idMap[d.activeChildId] || d.activeChildId);
      }
      localStorage.removeItem(LEGACY_KEY);
    } catch (e) {}
  }

  function findInRegistry(reg, childId) {
    for (var i = 0; i < reg.children.length; i++) {
      if (reg.children[i].id === childId) return reg.children[i];
    }
    return null;
  }

  function mergeChild(profile, data) {
    if (!profile) return null;
    data = data || defaultChildData();
    return {
      id: profile.id,
      name: profile.name,
      age: profile.age,
      focus: profile.focus || "",
      createdAt: profile.createdAt,
      packs: data.packs || [],
      writingPractice: data.writingPractice || { enabled: false, words: [] },
      progress: data.progress || defaultChildData().progress,
    };
  }

  function getMergedChild(childId) {
    var reg = loadRegistry();
    var profile = findInRegistry(reg, childId);
    if (!profile) return null;
    var data = loadChildData(childId);
    if (!data) {
      data = defaultChildData();
      saveChildData(childId, data);
    }
    return mergeChild(profile, data);
  }

  function withChildData(childId, mutator) {
    var child = getMergedChild(childId);
    if (!child) return null;
    var data = {
      packs: child.packs,
      writingPractice: child.writingPractice,
      progress: child.progress,
    };
    var result = mutator(data, child);
    saveChildData(childId, data);
    return result;
  }

  function findPackInData(data, packId) {
    if (!data || !data.packs) return null;
    for (var i = 0; i < data.packs.length; i++) {
      if (data.packs[i].id === packId) return data.packs[i];
    }
    return null;
  }

  function findWordInPack(pack, wordId) {
    if (!pack || !pack.words) return null;
    for (var i = 0; i < pack.words.length; i++) {
      if (pack.words[i].id === wordId) return pack.words[i];
    }
    return null;
  }

  function findWritingWordInData(data, wordId) {
    var wp = data && data.writingPractice;
    if (!wp || !wp.words) return null;
    for (var i = 0; i < wp.words.length; i++) {
      if (wp.words[i].id === wordId) return wp.words[i];
    }
    return null;
  }

  window.KittyPersonalStore = {
    uid: uid,
    generateChildId: generateChildId,

    getRegistry: function () {
      return loadRegistry();
    },

    getAll: function () {
      var reg = loadRegistry();
      var currentId = KittyPersonalStore.getCurrentChildId();
      return {
        version: 2,
        activeChildId: currentId,
        currentChildId: currentId,
        children: reg.children.map(function (p) {
          return getMergedChild(p.id);
        }).filter(Boolean),
      };
    },

    getCurrentChildId: function () {
      migrateLegacyOnce();
      try {
        var id = localStorage.getItem(CURRENT_CHILD_KEY);
        if (!id) return null;
        if (!findInRegistry(loadRegistry(), id)) {
          localStorage.removeItem(CURRENT_CHILD_KEY);
          return null;
        }
        return id;
      } catch (e) {
        return null;
      }
    },

    setCurrentChildId: function (childId) {
      migrateLegacyOnce();
      if (childId && !findInRegistry(loadRegistry(), childId)) return null;
      if (childId) {
        localStorage.setItem(CURRENT_CHILD_KEY, childId);
        withChildData(childId, function (data) {
          data.progress.lastVisit = Date.now();
        });
      } else {
        localStorage.removeItem(CURRENT_CHILD_KEY);
      }
      return childId;
    },

    setActiveChild: function (childId) {
      return KittyPersonalStore.setCurrentChildId(childId);
    },

    getActiveChild: function () {
      var id = KittyPersonalStore.getCurrentChildId();
      if (!id) return null;
      return getMergedChild(id);
    },

    listChildren: function () {
      return loadRegistry().children.slice();
    },

    getChild: function (childId) {
      return getMergedChild(childId);
    },

    addChild: function (profile) {
      var reg = loadRegistry();
      var name = String(profile.name || "").trim();
      if (!name) return null;
      var childId = generateChildId();
      var entry = {
        id: childId,
        name: name,
        age: Number(profile.age) || 0,
        focus: profile.focus || "",
        createdAt: Date.now(),
      };
      reg.children.push(entry);
      saveRegistry(reg);
      saveChildData(childId, defaultChildData());
      if (!KittyPersonalStore.getCurrentChildId()) {
        KittyPersonalStore.setCurrentChildId(childId);
      }
      return getMergedChild(childId);
    },

    updateChild: function (childId, patch) {
      var reg = loadRegistry();
      var profile = findInRegistry(reg, childId);
      if (!profile) return null;
      if (patch.name != null) profile.name = String(patch.name).trim();
      if (patch.age != null) profile.age = Number(patch.age) || 0;
      if (patch.focus != null) profile.focus = patch.focus;
      saveRegistry(reg);
      return getMergedChild(childId);
    },

    deleteChild: function (childId) {
      var reg = loadRegistry();
      reg.children = reg.children.filter(function (c) {
        return c.id !== childId;
      });
      saveRegistry(reg);
      try {
        localStorage.removeItem(childId);
      } catch (e) {}
      var current = KittyPersonalStore.getCurrentChildId();
      if (current === childId) {
        var next = reg.children.length ? reg.children[0].id : null;
        KittyPersonalStore.setCurrentChildId(next);
      }
      return reg;
    },

    getProgress: function (childId) {
      var child = getMergedChild(childId);
      if (!child) return null;
      var packs = child.packs || [];
      var totalWords = 0;
      var practicedWords = 0;
      packs.forEach(function (pack) {
        (pack.words || []).forEach(function (w) {
          totalWords++;
          if ((w.learnedCount || 0) > 0) practicedWords++;
        });
      });
      var writingTotal = (child.writingPractice && child.writingPractice.words) || [];
      return {
        totalWords: totalWords,
        practicedWords: practicedWords,
        packCount: packs.length,
        writingEnabled: !!(child.writingPractice && child.writingPractice.enabled),
        writingWordCount: writingTotal.filter(function (w) {
          return w.active !== false;
        }).length,
        totalWordsPracticed: child.progress.totalWordsPracticed || 0,
        totalWritingSuccess: child.progress.totalWritingSuccess || 0,
        lastVisit: child.progress.lastVisit,
      };
    },

    addPack: function (childId, packName) {
      return withChildData(childId, function (data) {
        data.packs = data.packs || [];
        var pack = { id: uid(), name: String(packName || "").trim(), createdAt: Date.now(), words: [] };
        if (!pack.name) return null;
        data.packs.push(pack);
        return pack;
      });
    },

    updatePack: function (childId, packId, patch) {
      return withChildData(childId, function (data) {
        var pack = findPackInData(data, packId);
        if (!pack) return null;
        if (patch.name != null) pack.name = String(patch.name).trim();
        return pack;
      });
    },

    deletePack: function (childId, packId) {
      return withChildData(childId, function (data) {
        data.packs = (data.packs || []).filter(function (p) {
          return p.id !== packId;
        });
        return data;
      });
    },

    addWord: function (childId, packId, wordData) {
      return withChildData(childId, function (data) {
        var pack = findPackInData(data, packId);
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
        return word;
      });
    },

    updateWord: function (childId, packId, wordId, patch) {
      return withChildData(childId, function (data) {
        var pack = findPackInData(data, packId);
        var word = findWordInPack(pack, wordId);
        if (!word) return null;
        if (patch.text != null) word.text = String(patch.text).trim();
        if (patch.imageUrl != null) word.imageUrl = patch.imageUrl;
        if (patch.audioUrl != null) word.audioUrl = patch.audioUrl;
        if (patch.useTts != null) word.useTts = !!patch.useTts;
        if (patch.favorite != null) word.favorite = !!patch.favorite;
        return word;
      });
    },

    deleteWord: function (childId, packId, wordId) {
      return withChildData(childId, function (data) {
        var pack = findPackInData(data, packId);
        if (!pack) return null;
        pack.words = (pack.words || []).filter(function (w) {
          return w.id !== wordId;
        });
        return pack;
      });
    },

    recordWordPractice: function (childId, packId, wordId) {
      return withChildData(childId, function (data) {
        var pack = findPackInData(data, packId);
        var word = findWordInPack(pack, wordId);
        if (!word) return null;
        word.learnedCount = (word.learnedCount || 0) + 1;
        word.lastPracticed = Date.now();
        data.progress.totalWordsPracticed = (data.progress.totalWordsPracticed || 0) + 1;
        return word;
      });
    },

    getPack: function (childId, packId) {
      var child = getMergedChild(childId);
      return findPackInData(child, packId);
    },

    updateWritingPractice: function (childId, patch) {
      return withChildData(childId, function (data) {
        data.writingPractice = data.writingPractice || { enabled: false, words: [] };
        if (patch.enabled != null) data.writingPractice.enabled = !!patch.enabled;
        return data.writingPractice;
      });
    },

    addWritingWord: function (childId, text) {
      return withChildData(childId, function (data) {
        data.writingPractice = data.writingPractice || { enabled: false, words: [] };
        data.writingPractice.words = data.writingPractice.words || [];
        var word = {
          id: uid(),
          text: String(text || "").trim(),
          active: true,
          correctCount: 0,
          lastPracticed: null,
          createdAt: Date.now(),
        };
        if (!word.text) return null;
        data.writingPractice.words.push(word);
        if (data.writingPractice.words.length === 1) data.writingPractice.enabled = true;
        return word;
      });
    },

    updateWritingWord: function (childId, wordId, patch) {
      return withChildData(childId, function (data) {
        var word = findWritingWordInData(data, wordId);
        if (!word) return null;
        if (patch.text != null) word.text = String(patch.text).trim();
        if (patch.active != null) word.active = !!patch.active;
        return word;
      });
    },

    deleteWritingWord: function (childId, wordId) {
      return withChildData(childId, function (data) {
        if (!data.writingPractice) return null;
        data.writingPractice.words = (data.writingPractice.words || []).filter(function (w) {
          return w.id !== wordId;
        });
        return data.writingPractice;
      });
    },

    recordWritingSuccess: function (childId, wordId) {
      return withChildData(childId, function (data) {
        var word = findWritingWordInData(data, wordId);
        if (!word) return null;
        word.correctCount = (word.correctCount || 0) + 1;
        word.lastPracticed = Date.now();
        data.progress.totalWritingSuccess = (data.progress.totalWritingSuccess || 0) + 1;
        return word;
      });
    },

    getActiveWritingWords: function (childId) {
      var child = getMergedChild(childId);
      if (!child || !child.writingPractice || !child.writingPractice.enabled) return [];
      return (child.writingPractice.words || []).filter(function (w) {
        return w.active !== false && w.text;
      });
    },
  };
})();
