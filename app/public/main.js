// on dom loaded
$(function() {

  $("form input[type=checkbox]").on("click", function(e){
    $div = $(this).parent();
    $input = $(this);
    var checked = $input.prop("checked");
    $input.prop("checked", checked);
    $div.toggleClass("active", checked);
    e.stopPropagation();
  });

  $("form .item").on("click", function(e) {
    $(this).find("input[type=checkbox]").click();
  });

  // enable tooltips
  $('[data-toggle="tooltip"]').tooltip();
  
});
