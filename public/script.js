// JavaScript to change button color when clicked
const changeColorBtn = document.getElementById('changeColorBtn');

// Event listener for the button
changeColorBtn.addEventListener('click', function() {
  // Generate a random color
  const randomColor = `#${Math.floor(Math.random()*16777215).toString(16)}`;
  document.body.style.backgroundColor = randomColor;
});