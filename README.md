# AIWA Audio Controller

Interface web local em Node.js para controlar dispositivos de áudio AIWA pelo Bluetooth Low Energy (BLE). O suporte inicial é dedicado à **AIWA Partybox PB-06**, mas a estrutura foi preparada para receber outros modelos no futuro.

O projeto funciona localmente, sem conta, nuvem ou servidor externo.

## Requisitos

- Windows 10 ou 11 com Bluetooth ligado
- Node.js 20 ou mais recente
- Microsoft Edge ou Google Chrome
- Um dispositivo compatível ligado e próximo do computador

## Executar

```powershell
npm start
```

O programa abre `http://127.0.0.1:4173`. Clique em **Conectar caixa** e selecione o dispositivo AIWA no seletor Bluetooth do navegador. Depois da primeira autorização, o programa tenta reconectar automaticamente nas próximas visitas.

> A conexão de áudio do Windows e a conexão de controle BLE são independentes. A caixa pode continuar pareada normalmente para tocar música.

## Recursos

- Equalizador com presets e ajuste manual de graves, médios e agudos
- Persistência local e restauração automática do último equalizador utilizado
- Reconexão automática ao dispositivo já autorizado pelo navegador
- Bass Boost
- LEDs: ligar/desligar, animações, cor RGB e intensidade
- Fonte Bluetooth, USB, Micro SD e AUX
- Play/pause, anterior, próxima e repetição
- Efeitos DJ e Scratch
- Timer de desligamento
- Leitura de bateria e versão do hardware, quando expostas pelo firmware

## Observações

Atualmente, o protocolo foi implementado e validado para a **AIWA Partybox PB-06**. Revisões de firmware podem não expor todos os controles; nesse caso a interface mostra o comando indisponível no diagnóstico, sem enviar dados para uma característica desconhecida.

## Desenvolvimento com inteligência artificial

Este projeto foi criado com auxílio de inteligência artificial da OpenAI. A IA foi utilizada na pesquisa de interoperabilidade do protocolo BLE, implementação, interface, documentação e testes. As decisões de uso, validação com o hardware e manutenção permanecem sob responsabilidade de quem utiliza e desenvolve o projeto.

Este é um projeto independente e não oficial. AIWA e os nomes dos produtos citados pertencem aos seus respectivos titulares.

Para rodar sem abrir automaticamente o navegador:

```powershell
npm run serve
```

Para verificar os comandos de protocolo:

```powershell
npm test
```
