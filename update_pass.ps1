A# Solicitar a nova senha e criptografá-la
$senha = Read-Host "Digite a nova senha" -AsSecureString
$senhaCriptografada = $senha | ConvertFrom-SecureString

# Salvar a senha criptografada em um arquivo
$senhaCriptografada | Out-File "C:\Users\rui.ramos\Desktop\Aintar\AINTAR\PServ.txt"
