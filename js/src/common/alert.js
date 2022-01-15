import '../lib/jquery.js'

export function removeAlert(id) {
  $(`#${id}`).remove();
}

export function removeAllAlerts() {
  $('.alert').remove();
}

export function renderAlert(id, title, message, type, delay = 0) {
    const myAlert = alertHTML(id, title, message, type)
    $('body').append(myAlert);
    if (delay > 0) {
      setTimeout(function() {$(`#${id}`).fadeOut("slow", () => {$(`#${id}`).remove()})}, delay);                          
    }
}

export function alertHTML(id, title, message, type) {
    type = (!type)?'primary':type
    return `
    <div class="alert alert-${type} alert-dismissible fade show position-fixed bottom-0 w-100 text-center" role="alert" id=${id}>
    <strong>${title}&nbsp&nbsp</strong> ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  </div>
`
}
