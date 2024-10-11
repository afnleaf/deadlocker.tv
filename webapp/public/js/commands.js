// commands.js
// need to add css

const codeTags = document.querySelectorAll('code');

codeTags.forEach((codeTag, index) => {
    // create copy button
    const copyButton = document.createElement('button');
    copyButton.textContent = 'Copy';
    copyButton.className = 'copy-button';
    copyButton.setAttribute('data-index', index);

    // insert button after code tag
    codeTag.parentNode.insertBefore(copyButton, codeTag.nextSibling);

    // add click event listener
    copyButton.addEventListener('click', () => {
        const codeContent = codeTag.textContent;
        navigator.clipboard.writeText(codeContent).then(() => {
            copyButton.textContent = 'Copied!';
            setTimeout(() => {
                copyButton.textContent = 'Copy';
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    });
});
