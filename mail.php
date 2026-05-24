<?php
header('Content-Type: application/json; charset=utf-8');

// Sadece POST isteklerini kabul et
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

// Gelen verileri al ve temizle
$name    = trim(strip_tags($_POST['name']    ?? ''));
$email   = trim(strip_tags($_POST['email']   ?? ''));
$message = trim(strip_tags($_POST['message'] ?? ''));

// Validasyon
if (empty($name) || empty($email) || empty($message)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Tüm alanlar zorunludur.']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Geçerli bir e-posta adresi giriniz.']);
    exit;
}

// --- BURAYA KENDİ E-POSTA ADRESİNİ YAZ ---
$to      = 'info@meridianturkey.com';
$subject = 'Meridian Turkey | Yeni İletişim Formu Mesajı';

$body  = "Ad Soyad : $name\n";
$body .= "E-posta  : $email\n";
$body .= "Mesaj    :\n$message\n";

$headers  = "From: no-reply@meridianturkey.com\r\n";
$headers .= "Reply-To: $email\r\n";
$headers .= "X-Mailer: PHP/" . phpversion();

$sent = mail($to, $subject, $body, $headers);

if ($sent) {
    echo json_encode(['success' => true, 'message' => 'Mesajınız iletildi. En kısa sürede dönüş yapacağız.']);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Mesaj gönderilemedi. Lütfen tekrar deneyin.']);
}
