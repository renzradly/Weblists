//below are used to download the images quickly in Masonry especially if cached in the browser
setTimeout(function () {
  var msnry = new Masonry(".grid");
  msnry.layout();
}, 100);

setTimeout(function () {
  var msnry = new Masonry(".grid");
  msnry.layout();
}, 300);

setTimeout(function () {
  var msnry = new Masonry(".grid");
  msnry.layout();
}, 1000);

setTimeout(function () {
  var msnry = new Masonry(".grid");
  msnry.layout();
}, 5000);

function limitCharacter() {
  const maxLimitDescription = 500;
  const errorMessage = "Maximum letters/character limit reached!";

  if (maxLimitDescription <= descriptionTextArea.value.length) {
    descriptionTextArea.value = descriptionTextArea.value.substring(
      0,
      maxLimitDescription
    );
    document.getElementById("letters").innerHTML =
      errorMessage;
  } else {
    document.getElementById(
      "letters"
    ).innerHTML = `${descriptionTextArea.value.length} of 500`;
  }
}
