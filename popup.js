document.addEventListener('DOMContentLoaded', function() {
  const inputText = document.getElementById('inputText');
  const translatedText = document.getElementById('translatedText');
  const detectedLang = document.getElementById('detectedLang');
  const sourceLang = document.getElementById('sourceLang');
  const targetLang = document.getElementById('targetLang');
  
  let translationTimeout;

  // Load saved preferences
  chrome.storage.local.get(['sourceLang', 'targetLang'], function(result) {
    if (result.sourceLang) sourceLang.value = result.sourceLang;
    if (result.targetLang) targetLang.value = result.targetLang;
  });

  // Save language preferences when changed
  sourceLang.addEventListener('change', function() {
    chrome.storage.local.set({sourceLang: sourceLang.value});
    if (inputText.value.trim()) {
      translateText();
    }
  });

  targetLang.addEventListener('change', function() {
    chrome.storage.local.set({targetLang: targetLang.value});
    if (inputText.value.trim()) {
      translateText();
    }
  });

  // Check if there's selected text when popup opens
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {action: "getSelectedText"}, function(response) {
      if (response && response.selectedText) {
        inputText.value = response.selectedText;
        translateText();
      }
    });
  });

  // Auto-translate on input with debouncing
  inputText.addEventListener('input', function() {
    clearTimeout(translationTimeout);
    translationTimeout = setTimeout(() => {
      if (inputText.value.trim()) {
        translateText();
      } else {
        translatedText.textContent = '';
        detectedLang.textContent = '';
      }
    }, 500); // Wait 500ms after user stops typing
  });

  // Translate on paste
  inputText.addEventListener('paste', function() {
    setTimeout(() => {
      if (inputText.value.trim()) {
        translateText();
      }
    }, 100);
  });

  function translateText() {
    const text = inputText.value.trim();
    if (!text) return;

    translatedText.textContent = 'Translating...';
    detectedLang.textContent = '';

    const sl = sourceLang.value;
    const tl = targetLang.value;

    // Using improved Google Translate API endpoint
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&hl=${tl}&dt=t&dt=bd&dt=qca&dt=rm&dt=ex&dt=at&dt=ss&dt=rw&dt=ld&dj=1&source=icon&q=${encodeURIComponent(text)}`;

    fetch(url)
      .then(response => response.json())
      .then(data => {
        if (data.sentences) {
          const translation = data.sentences.map(s => s.trans).join('');
          translatedText.textContent = translation;
          
          // Show alternative translations if available
          if (data.dict && data.dict.length > 0) {
            let alternatives = [];
            data.dict.forEach(item => {
              if (item.terms && item.terms.length > 0) {
                alternatives = alternatives.concat(item.terms.slice(0, 3));
              }
            });
            if (alternatives.length > 0) {
              translatedText.innerHTML += '<div class="alternatives">Other: ' + alternatives.join(', ') + '</div>';
            }
          }
          
          if (data.src && sl === 'auto') {
            const langNames = {
              'en': 'English',
              'bn': 'Bangla (বাংলা)',
              'es': 'Spanish',
              'fr': 'French',
              'de': 'German',
              'it': 'Italian',
              'pt': 'Portuguese',
              'ru': 'Russian',
              'ja': 'Japanese',
              'ko': 'Korean',
              'zh': 'Chinese',
              'ar': 'Arabic',
              'hi': 'Hindi'
            };
            detectedLang.textContent = `Detected: ${langNames[data.src] || data.src}`;
          }
        }
      })
      .catch(error => {
        translatedText.textContent = 'Translation failed. Please try again.';
        console.error('Translation error:', error);
      });
  }
});