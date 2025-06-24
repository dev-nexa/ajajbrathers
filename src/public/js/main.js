// إخفاء رسائل التنبيه تلقائياً
$(document).ready(function() {
    // إخفاء رسائل التنبيه بعد 5 ثواني
    setTimeout(function() {
        $('.alert').fadeOut('slow');
    }, 5000);

    // تفعيل tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // تفعيل popovers
    var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });
}); 