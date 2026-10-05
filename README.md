# AIWA Audio Controller

Interface web estática para controlar dispositivos de áudio AIWA pelo Bluetooth Low Energy (BLE). O suporte inicial é dedicado à **AIWA Partybox PB-06**, mas a estrutura foi preparada para receber outros modelos no futuro.

O controle Bluetooth acontece diretamente entre o navegador e a caixa, sem conta e sem enviar os dados do dispositivo para um servidor.

## Usar online

Acesse **[grosseirao.github.io/aiwa-audio-controller](https://grosseirao.github.io/aiwa-audio-controller/)** no Microsoft Edge ou Google Chrome. Clique em **Conectar caixa** e selecione o dispositivo AIWA no seletor Bluetooth do navegador.

O site é publicado gratuitamente pelo GitHub Pages. Depois da primeira autorização, a interface tenta reconectar automaticamente ao dispositivo salvo nas próximas visitas.

## Requisitos

- Windows 10 ou 11 com Bluetooth ligado
- Node.js 20 ou mais recente
- Microsoft Edge ou Google Chrome
- Um dispositivo compatível ligado e próximo do computador

## Executar localmente

```powershell
npm start
```

O programa abre `http://127.0.0.1:4173`. O servidor Node serve apenas os mesmos arquivos estáticos publicados no GitHub Pages e é opcional para quem prefere usar o site online.

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

O navegador exige uma ação do usuário para autorizar um dispositivo Bluetooth. Essa permissão pertence ao navegador e ao endereço usado, portanto a autorização do site online é separada da autorização concedida anteriormente ao endereço local.

## Desenvolvimento com inteligência artificial

Este projeto foi criado com auxílio de inteligência artificial da OpenAI. A IA foi utilizada na pesquisa de interoperabilidade do protocolo BLE, implementação, interface, documentação e testes. As decisões de uso, validação com o hardware e manutenção permanecem sob responsabilidade de quem utiliza e desenvolve o projeto.

Este é um projeto independente e não oficial. AIWA e os nomes dos produtos citados pertencem aos seus respectivos titulares.

## Licença

Copyright (C) 2026 AIWA Audio Controller contributors.

Distribuído sob a **GNU General Public License v3.0 ou posterior** (`GPL-3.0-or-later`). Você pode usar, estudar, modificar e redistribuir o projeto. Ao distribuir o programa ou uma versão derivada, o código-fonte correspondente deve permanecer disponível sob a mesma licença. Consulte o arquivo [LICENSE](LICENSE) para os termos completos.

Não há garantia para este programa, na extensão permitida pela legislação aplicável.

Para rodar sem abrir automaticamente o navegador:

```powershell
npm run serve
```

Para verificar os comandos de protocolo:

```powershell
npm test
```
