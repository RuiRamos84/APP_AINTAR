' Script de Brincadeira - Versão HTML com texto GIGANTE!
' Guarda como: brincadeira.vbs

Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

Dim mensagens(19)
mensagens(0) = "LEMBRA-TE SEMPRE DE BLOQUEAR O COMPUTADOR!|Um segundo de distração = Uma vida de arrependimento!"
mensagens(1) = "SEGURANÇA EM PRIMEIRO LUGAR, COLEGA!|Tu és o guardião dos dados da empresa!"
mensagens(2) = "UM COMPUTADOR DESBLOQUEADO É UM PARQUE DE DIVERSÕES!|Toda a gente pode brincar com os teus ficheiros!"
mensagens(3) = "PRÓXIMA VEZ BLOQUEIA O ECRÃ, SIM?|É só pressionar Windows + L, não é rocket science!"
mensagens(4) = "A SEGURANÇA NÃO TIRA FÉRIAS!|Nem de noite, nem de dia, nem ao fim-de-semana!"
mensagens(5) = "COMPUTADOR DESBLOQUEADO = BRINCADEIRA GARANTIDA!|É como deixar a porta de casa aberta!"
mensagens(6) = "WINDOWS + L É O TEU MELHOR AMIGO!|Mais fiel que um cão, mais útil que um canivete suíço!"
mensagens(7) = "QUEM SABE O QUE PODE ACONTECER NUM PC DESBLOQUEADO...|Talvez alguém mude o teu fundo para unicórnios cor-de-rosa!"
mensagens(8) = "ALERTA MÁXIMO: COMPUTADOR VULNERÁVEL DETECTADO!|Enviando helicópteros de emergência de segurança informática!"
mensagens(9) = "DICA PROFISSIONAL: SEMPRE BLOQUEAR AO SAIR!|Os profissionais de IT fazem-no automaticamente!"
mensagens(10) = "MISSÃO: ENSINAR BOAS PRÁTICAS DE SEGURANÇA!|Pontuação atual: PRECISA MELHORAR!"
mensagens(11) = "ESTA MENSAGEM VAI REPETIR-SE VÁRIAS VEZES...|Até aprenderes a lição ou ficares maluco!"
mensagens(12) = "SE FOSSE O TEU TELEMÓVEL TAMBÉM DEIXAVAS DESBLOQUEADO?|Então porque é que o computador é diferente?"
mensagens(13) = "A EMPRESA CONFIA EM TI PARA MANTERES TUDO SEGURO!|Não deixes os colegas na mão!"
mensagens(14) = "DEMORA 2 SEGUNDOS A BLOQUEAR, MAS PODE EVITAR HORAS DE PROBLEMAS!|E muito dinheiro em prejuízos!"
mensagens(15) = "ALGUÉM PODE MUDAR O TEU PAPEL DE PAREDE PARA ALGO... INTERESSANTE!|Tipo unicórnios dançando techno!"
mensagens(16) = "E SE ALGUÉM ENVIAR EMAILS ESTRANHOS EM TEU NOME?|'Olá chefe, demito-me para ser palhaço de circo!'"
mensagens(17) = "BLOQUEAR O PC É COMO ESCOVAR OS DENTES!|Fazes todos os dias, várias vezes, sem pensar!"
mensagens(18) = "ESTA TECNOLOGIA AVANÇADA CHAMA-SE 'RESPONSABILIDADE'!|Requer o uso do cérebro (incluído na compra)!"
mensagens(19) = "ÚLTIMO AVISO: ESTA É A TUA ÚLTIMA OPORTUNIDADE DE APRENDER!|Ou vais ter que repetir o ano de segurança informática!"

Dim totalCliques
totalCliques = 20
Randomize

For i = 1 To totalCliques
    ' Escolhe mensagem aleatória
    mensagemIndex = Int(Rnd() * 20)
    partesMsg = Split(mensagens(mensagemIndex), "|")
    titulo = partesMsg(0)
    subtitulo = partesMsg(1)
    
    ' Cria ficheiro HTML temporário
    htmlFile = objFSO.GetSpecialFolder(2) & "\alerta_seguranca.html"
    
    ' Define cor de fundo baseada no progresso
    If i < 5 Then
        corFundo = "#FFE6E6"
        corTexto = "#CC0000"
    ElseIf i < 10 Then
        corFundo = "#FFCCCC"
        corTexto = "#990000"
    ElseIf i < 15 Then
        corFundo = "#FF9999"
        corTexto = "#660000"
    ElseIf i < 19 Then
        corFundo = "#FF6666"
        corTexto = "#330000"
    Else
        corFundo = "#FF0000"
        corTexto = "#FFFFFF"
    End If
    
    ' Cria conteúdo HTML
    htmlContent = "<!DOCTYPE html>" & vbCrLf & _
    "<html><head><title>ALERTA DE SEGURANÇA</title>" & vbCrLf & _
    "<style>" & vbCrLf & _
    "body { background-color: " & corFundo & "; font-family: Arial Black, Arial; text-align: center; margin: 0; padding: 20px; }" & vbCrLf & _
    ".container { background: white; border: 10px solid " & corTexto & "; border-radius: 20px; padding: 30px; margin: 20px; box-shadow: 0 0 30px rgba(0,0,0,0.5); }" & vbCrLf & _
    ".titulo { font-size: 48px; font-weight: bold; color: " & corTexto & "; margin: 20px 0; text-shadow: 3px 3px 6px rgba(0,0,0,0.3); }" & vbCrLf & _
    ".subtitulo { font-size: 28px; font-weight: bold; color: #333; margin: 20px 0; }" & vbCrLf & _
    ".contador { font-size: 36px; font-weight: bold; color: " & corTexto & "; background: " & corFundo & "; padding: 20px; border-radius: 15px; margin: 30px 0; }" & vbCrLf & _
    ".botao { font-size: 24px; font-weight: bold; background: " & corTexto & "; color: white; border: none; padding: 15px 30px; border-radius: 10px; cursor: pointer; margin: 10px; }" & vbCrLf & _
    ".botao:hover { background: #000; }" & vbCrLf & _
    ".alerta { font-size: 32px; font-weight: bold; color: " & corTexto & "; animation: piscar 1s infinite; }" & vbCrLf & _
    "@keyframes piscar { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }" & vbCrLf & _
    "</style></head><body>" & vbCrLf & _
    "<div class='container'>" & vbCrLf & _
    "<div class='alerta'>🚨 DEPARTAMENTO DE SEGURANÇA INFORMÁTICA 🚨</div><br>" & vbCrLf & _
    "<div class='titulo'>" & titulo & "</div>" & vbCrLf & _
    "<div class='subtitulo'>" & subtitulo & "</div>" & vbCrLf & _
    "<div class='contador'>CLIQUE " & i & " DE " & totalCliques & "<br>AINDA FALTAM " & (totalCliques - i) & " CLIQUES!</div>" & vbCrLf
    
    ' Adiciona mensagem baseada no progresso
    If i < 5 Then
        htmlContent = htmlContent & "<div class='subtitulo'>😴 Ainda estás a começar... 😴</div>"
    ElseIf i < 10 Then
        htmlContent = htmlContent & "<div class='subtitulo'>😅 Começa a ficar chato... 😅</div>"
    ElseIf i < 15 Then
        htmlContent = htmlContent & "<div class='subtitulo'>😰 A meio caminho... 😰</div>"
    ElseIf i < 19 Then
        htmlContent = htmlContent & "<div class='subtitulo'>😵 Quase lá... 😵</div>"
    Else
        htmlContent = htmlContent & "<div class='subtitulo'>🏁 ÚLTIMO CLIQUE! 🏁</div>"
    End If
    
    htmlContent = htmlContent & vbCrLf & _
    "<br><button class='botao' onclick='window.close()'>CONTINUAR (OK)</button>" & vbCrLf & _
    "<button class='botao' onclick='tentarPassword()'>PALAVRA-PASSE SECRETA</button>" & vbCrLf & _
    "</div>" & vbCrLf & _
    "<script>" & vbCrLf & _
    "function tentarPassword() {" & vbCrLf & _
    "  var pass = prompt('Introduz a palavra-passe secreta:');" & vbCrLf & _
    "  if (pass && pass.toLowerCase() === 'seguranca123') {" & vbCrLf & _
    "    alert('PALAVRA-PASSE CORRECTA! Script terminado.');" & vbCrLf & _
    "    window.close();" & vbCrLf & _
    "  } else {" & vbCrLf & _
    "    alert('PALAVRA-PASSE INCORRECTA! O script continua...');" & vbCrLf & _
    "  }" & vbCrLf & _
    "}" & vbCrLf & _
    "window.focus();" & vbCrLf & _
    "setInterval(function(){ window.focus(); }, 1000);" & vbCrLf & _
    "</script></body></html>"
    
    ' Escreve ficheiro HTML
    Set objFile = objFSO.CreateTextFile(htmlFile, True)
    objFile.Write htmlContent
    objFile.Close
    
    ' Abre no browser em fullscreen
    objShell.Run """" & htmlFile & """", 3, True
    
    ' Pequena pausa
    WScript.Sleep 300
Next

' Mensagem final
htmlFinal = objFSO.GetSpecialFolder(2) & "\certificado_seguranca.html"
htmlContentFinal = "<!DOCTYPE html><html><head><title>CERTIFICADO</title>" & _
"<style>body { background: linear-gradient(45deg, #00FF00, #008000); font-family: Arial Black; text-align: center; margin: 0; padding: 20px; }" & _
".container { background: white; border: 15px solid #008000; border-radius: 30px; padding: 50px; margin: 20px; box-shadow: 0 0 50px rgba(0,0,0,0.8); }" & _
".titulo { font-size: 64px; font-weight: bold; color: #008000; margin: 30px 0; text-shadow: 5px 5px 10px rgba(0,0,0,0.3); }" & _
".texto { font-size: 32px; font-weight: bold; color: #333; margin: 20px 0; }" & _
".destaque { font-size: 40px; color: #008000; }" & _
"</style></head><body>" & _
"<div class='container'>" & _
"<div class='titulo'>🏆 PARABÉNS! MISSÃO CUMPRIDA! 🏆</div>" & _
"<div class='destaque'>AGORA JÁ SABES A LIÇÃO:</div>" & _
"<div class='texto'>SEMPRE bloquear o computador quando te ausentas!</div>" & _
"<div class='texto'>🔑 Windows + L (o mais rápido!)<br>🔑 Ctrl + Alt + Del → Bloquear<br>🔑 Menu Iniciar → Bloquear</div>" & _
"<div class='destaque'>A SEGURANÇA AGRADECE!</div>" & _
"<div class='texto'>E lembra-te: da próxima vez que saíres sem bloquear...<br><strong>EU VOLTO! 👻</strong></div>" & _
"<button onclick='window.close()' style='font-size: 24px; padding: 20px 40px; background: #008000; color: white; border: none; border-radius: 15px; font-weight: bold;'>FECHAR</button>" & _
"</div></body></html>"

Set objFileFinal = objFSO.CreateTextFile(htmlFinal, True)
objFileFinal.Write htmlContentFinal
objFileFinal.Close
objShell.Run """" & htmlFinal & """", 3, True
