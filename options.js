var options = [
    'mouseDragButton',
    'showHoverMessage',
    'freeScaling',
    'stopResizingOnMouseLeave',
    'enableImageSizeLimit',
    'controlEnables'
];

document.addEventListener('DOMContentLoaded', () => {
    var preferences = {};
    browser.storage.sync.get('preferences')
        .then(res => {
            if (!res.preferences) {
                return;
            }

            preferences = res.preferences;
            for (let key in preferences) {
                let val = preferences[key];
                let el = document.querySelector('#' + key);
                if (el) {
                    el.checked = val;
                }
            }
        });

        document.querySelectorAll('input').forEach((el) => {
            el.addEventListener('change', (event) => {
                preferences[el.name] = el.checked;
                browser.storage.sync.set({ preferences });
            });
        });
});