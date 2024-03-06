const makeWASocket = require('@whiskeysockets/baileys').default
const { delay, DisconnectReason, fetchLatestBaileysVersion, useMultiFileAuthState } = require('@whiskeysockets/baileys')
const { unlink, existsSync, mkdirSync } = require('fs');
const P = require('pino');
const fs = require('fs');
const cep = require('cep-promise');
const dayjs = require('dayjs');
require('dayjs/locale/pt-br');
const Path = 'Session';
const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');
const { Configuration, OpenAIApi } = require('openai')
const configuration = new Configuration({
    organization: 'org-VFUhoDEf3BKa0y3AjScb1MBo',
    apiKey: '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',
});
const openai = new OpenAIApi(configuration);
initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();
const GroupCheck = (jid) => {
    const regexp = new RegExp(/^\d{18}@g.us$/)
    return regexp.test(jid)
}

const Update = (sock) => {
    sock.on('connection.update', ({ connection, lastDisconnect, qr }) => {
        if (qr) {
            console.log('Qrcode: ', qr);
        };
        if (connection === 'close') {
            const Reconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut
            if (Reconnect) Connection()
            console.log(`CONEXÃO FECHADA! RAZÃO: ` + DisconnectReason.loggedOut.toString());
            if (Reconnect === false) {
                fs.rmSync(Path, { recursive: true, force: true });
                const removeAuth = Path
                unlink(removeAuth, err => {
                    if (err) throw err
                })
            }
        }
        if (connection === 'open') {
            console.log('BOT CONECTADO')
        }
    })
}

const Connection = async () => {
    const { version } = await fetchLatestBaileysVersion()
    const { state, saveCreds } = await useMultiFileAuthState('Session')
    const config = {
        auth: state,
        logger: P({ level: 'error' }),
        printQRInTerminal: true,
        generateHighQualityLinkPreview: true,
        syncFullHistory: true,
        keepAliveIntervalMs: 5000,
        version,
        connectTimeoutMs: 60_000,
        emitOwnEvents: false,
        async getMessage(key) {
            return { conversation: key };
        },
        patchMessageBeforeSending: (message) => {
            const requiresPatch = !!(message.buttonsMessage || message.listMessage || message.templateMessage);
            if (requiresPatch) {
                message = {
                    viewOnceMessageV2: {
                        message: {
                            messageContextInfo: {
                                deviceListMetadataVersion: 2,
                                deviceListMetadata: {},
                            },
                            ...message,
                        },
                    },
                };
            }
            return message;
        },
    }
    const sock = makeWASocket(config);
    Update(sock.ev);
    sock.ev.on('creds.update', saveCreds);

    const SendMessage = async (jid, msg) => {
        await sock.presenceSubscribe(jid)
        await delay(2000)
        await sock.sendPresenceUpdate('composing', jid)
        await delay(1500)
        await sock.sendPresenceUpdate('paused', jid)
        return await sock.sendMessage(jid, msg)
    }
    const getDavinciResponse = async (clientText) => {
        const options = {
            model: "text-davinci-003", // Modelo GPT a ser usado
            prompt: clientText, // Texto enviado pelo usuário
            temperature: 1, // Nível de variação das respostas geradas, 1 é o máximo
            max_tokens: 4000 // Quantidade de tokens (palavras) a serem retornadas pelo bot, 4000 é o máximo
        }

        try {

            const response = await openai.createCompletion(options)
            let botResponse = ""
            response.data.choices.forEach(({ text }) => {
                botResponse += text
            })
            return `${botResponse.trim()}`
        } catch (e) {
            return `❌ OpenAI Response Error: ${e.response.data.error.message}`
        }
    }


    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        const msg = messages[0]
        const nomeUsuario = msg.pushName;
        const jid = msg.key.remoteJid
        const numero = jid.replace(/\D/g, '');



        if (!msg.key.fromMe && jid !== 'status@broadcast' && !GroupCheck(jid)) {
            sock.readMessages(jid, msg.key.participant, [msg.key.id])
            const filePath = `./info/${numero}.json`
            const docRef = db.collection('users').doc(numero);
            const anjoRef = await docRef.get()
            const depoimentoRef = db.collection('users').doc(numero)
            const depoimentoRef2 = db.collection('denuncias').doc()
            const quantidadeDenuncia = db.collection('contador').doc('denuncias')

            const dateNow = new Date();
            const currentMonth = dateNow.getMonth() + 1;
            const diarometro = db.collection('diarometro').doc()
            let date = new Date(Date.now());
            let horarioAtual = dayjs(date).locale('pt-br')


            let data = {
                nome: '',
                apelido: '',
                cep: '',
                estado: '',
                cidade: '',
                bairro: '',
                rua: '',
                depoimentos: '',
                nome_terceiros: '',
                local_terceiros: '',
                numeroAnjo: '',
                numerosAnjo: [],
                nivel_do_dp: '',
                denuncia2: '',
                depoimentos_terceiros: '',
                depoimentos_diarometro: [],
                dataN: '',
                email: '',
                nome_empresa: '',
                endereco_empresa: '',
                cep_empresa: '',
                email_empresa: '',
                ramo_de_atividade: '',
                nomeEmbaixador: '',
                stage: 'inicial',
                bot: true
            }
            if (fs.existsSync(filePath)) {

            } else {
                fs.writeFileSync(filePath, JSON.stringify(data, null, 1), 'utf-8', (err) => {
                    if (err) throw err;
                    console.log('O arquivo foi criado!');
                });

                // const buttons = [
                //     { buttonId: 'Eu mulher', buttonText: { displayText: '🙋‍♀️ Eu mulher 💋💄' }, type: 1 },
                //     { buttonId: 'Eu mulher', buttonText: { displayText: '✌️ Eu voluntário' }, type: 1 },
                //     { buttonId: 'Eu mulher', buttonText: { displayText: '➕ Mais opções' }, type: 1 },
                // ];
                // const buttonMessage = {
                //     text: `👩‍⚖️ Olá *${nomeUsuario}*\r\nseja bem vinda ao meu mundo!\r\nsou a LUZIA ! Sua amiga e conselheira virtual.\r\nMinha missão na terra é lutar pelo fim da violência contra a mulher.\r\nQUAL É SUA MISSÃO???\r\nlhe convido a entrar e juntar-se comigo nessa causa.\r\nsendo uma VÍTIMA ou VOLUNTÁRIO\r\nentre para nossa comunidade e conheça toda nossa rede de apoio e acolhimento.\r\nLEMBRE-SE!!!\r\nvocê não está sozinha!\r\nReaja em quanto há tempo! ou entre para uma legião de voluntariados que apoiam direto ou indiretamente.`,
                //     footer: 'Escolha uma das opções abaixo!',
                //     buttons: buttons,
                //     headerType: 1
                // }
                // await SendMessage(jid, buttonMessage)
            }
            if (msg.message.buttonsResponseMessage) {
                const gerenciador = fs.readFileSync(filePath, 'utf-8')
                const user = JSON.parse(gerenciador)
                const info = fs.readFileSync(filePath, 'utf-8')
                const userInfo = JSON.parse(info)
                console.log(msg.message.buttonsResponseMessage.selectedButtonId)
                if (msg.message.buttonsResponseMessage.selectedButtonId === 'Eu mulher' && userInfo.bot === true) {
                    user.stage = 'perguntar nome'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.buttonsResponseMessage.selectedButtonId === 'Eu mulher' && userInfo.bot === true && userInfo.email !== '') {
                    user.stage = 'eu mulher ja cadastrado'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.buttonsResponseMessage.selectedButtonId === 'Canais de denuncia' && userInfo.bot === true) {
                    user.stage = 'escolheu canais de denuncia'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.buttonsResponseMessage.selectedButtonId === 'Denúncia' || msg.message.buttonsResponseMessage.selectedButtonId === 'Denunciar novamente' && userInfo.bot === true) {
                    user.stage = 'escolheu denuncia'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.buttonsResponseMessage.selectedButtonId === 'Para Mim Mesmo' && userInfo.bot === true) {
                    user.stage = 'denuncia para mim mesmo'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.buttonsResponseMessage.selectedButtonId === 'Para terceiros' && userInfo.bot === true) {
                    user.stage = 'denuncia Para terceiros'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.buttonsResponseMessage.selectedButtonId === 'Menu inicial' && userInfo.bot === true) {
                    user.stage = 'inicial'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.buttonsResponseMessage.selectedButtonId === 'SimEnviardp' && userInfo.bot === true) {
                    await depoimentoRef.update({
                        depoimentos: FieldValue.arrayUnion({
                            depoimento: userInfo.depoimentos,
                            hora: `${horarioAtual}`
                        })
                    });
                    await depoimentoRef2.set({
                        numero: numero,
                        depoimento: userInfo.depoimentos,
                        hora: Timestamp.fromDate(new Date()),
                        nomeCompleto: userInfo.nome,
                        apedido: userInfo.apelido,
                        cep: userInfo.cep,
                        bairro: userInfo.bairro,
                        rua: userInfo.rua,
                        dataN: userInfo.dataN,
                        email: msg.message.conversation,
                        mes: currentMonth

                    });
                    await quantidadeDenuncia.update({
                        numero: FieldValue.increment(1),

                    });
                    user.depoimentos = ''
                    user.stage = 'perguntar fluxo'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.buttonsResponseMessage.selectedButtonId === 'NãoEnviardp' && userInfo.bot === true) {
                    user.stage = 'cancelou o depoimento'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.buttonsResponseMessage.selectedButtonId === 'Papel de Parede' && userInfo.bot === true) {
                    user.stage = 'mandar o papel de parede'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.buttonsResponseMessage.selectedButtonId === 'Diarômetro' && userInfo.bot === true) {
                    user.stage = 'mandar a lista do diarometro'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.buttonsResponseMessage.selectedButtonId === 'Disque emergência' && userInfo.bot === true) {
                    user.stage = 'mandar lista de numeros de emergencia'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.buttonsResponseMessage.selectedButtonId === 'naoConfirmaAddNumVazio' && userInfo.bot === true) {
                    user.stage = 'pedir para digitar um numero para add'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.buttonsResponseMessage.selectedButtonId === 'NãoEnviarPapel' && userInfo.bot === true) {
                    user.stage = 'não quis enviar dp do papel de parede'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.buttonsResponseMessage.selectedButtonId === 'SimEnviarPapel' && userInfo.bot === true) {
                    user.stage = 'escolheu denuncia'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.buttonsResponseMessage.selectedButtonId === 'SimEnviarDpDiarometro' && userInfo.bot === true) {
                    user.stage = 'escolheu enviar uma denuncia diarometro'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.buttonsResponseMessage.selectedButtonId === 'NaoEnviarDpDiarometro' && userInfo.bot === true) {
                    user.stage = 'escolheu não enviar uma denuncia diarometro'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.buttonsResponseMessage.selectedButtonId === 'NãoEnviarDpDiarometro' && userInfo.bot === true) {
                    user.stage = 'escolheu nao enviar denuncia diarometro'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.buttonsResponseMessage.selectedButtonId === 'EnviarDpDiarometro' && userInfo.bot === true) {
                    const diarometroDenuncia = db.collection('contador').doc('denuncias')
                    await depoimentoRef.update({
                        diarometro: FieldValue.arrayUnion({
                            depoimento: userInfo.dp_diarometro,
                            titulo: userInfo.titulo_do_dp,
                            nivel: userInfo.nivel_do_dp,
                            hora: `${horarioAtual}`
                        })
                    });
                    await depoimentoRef2.set({
                        depoimento: userInfo.dp_diarometro,
                        titulo: userInfo.titulo_do_dp,
                        nivel: userInfo.nivel_do_dp,
                        hora: Timestamp.fromDate(new Date()),
                        nomeCompleto: userInfo.nome,
                        apedido: userInfo.apelido,
                        cep: userInfo.cep,
                        bairro: userInfo.bairro,
                        rua: userInfo.rua,
                        dataN: userInfo.dataN,
                        email: userInfo.email,
                        mes: currentMonth
                    });
                    await diarometro.set({
                        numero: numero,
                        depoimento: userInfo.dp_diarometro,
                        titulo: userInfo.titulo_do_dp,
                        nivel: userInfo.nivel_do_dp,
                        hora: `${horarioAtual}`
                    });
                    await quantidadeDenuncia.update({
                        numero: FieldValue.increment(1),
                        [userInfo.titulo_do_dp]: FieldValue.increment(1),
                    });

                    user.stage = 'dp diarometro enviado com sucesso';
                    user.depoimentos_diarometro = []
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.buttonsResponseMessage.selectedButtonId === 'NEnviarDpDiarometro' && userInfo.bot === true) {
                    user.nivel_do_dp = ''
                    user.depoimentos_diarometro = []
                    user.stage = 'escolheu nao enviar denuncia diarometro'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.buttonsResponseMessage.selectedButtonId === 'Anjo da Guarda' && anjoRef.data().numerosAnjo !== [] && userInfo.bot === true) {
                    user.stage = 'confirmou o numero que digitou'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.buttonsResponseMessage.selectedButtonId === 'Anjo da Guarda' && anjoRef.data().numerosAnjo === [] && userInfo.bot === true) {
                    user.stage = 'escolheu anjo da guarda vazio'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.buttonsResponseMessage.selectedButtonId === 'para1Numero' && userInfo.numeroAnjo !== '' && userInfo.bot === true) {
                    user.stage = 'enviar dp para 1 numero'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.buttonsResponseMessage.selectedButtonId === 'simAddNumVazio' && userInfo.bot === true) {
                    user.stage = 'pedir para digitar um numero para add'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.buttonsResponseMessage.selectedButtonId === 'simConfirmaAddNumVazio' && userInfo.bot === true) {
                    await depoimentoRef.update({
                        numerosAnjo: FieldValue.arrayUnion(userInfo.numeroAnjo)
                    });
                    user.numerosAnjo.push(userInfo.numeroAnjo)

                    user.stage = 'confirmou o numero que digitou'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.buttonsResponseMessage.selectedButtonId === 'simAddMaisNumVazio' && userInfo.bot === true) {
                    user.stage = 'pedir para digitar um numero para add mais'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.buttonsResponseMessage.selectedButtonId === 'simConfirmaAddMaisNumVazio' && userInfo.bot === true) {
                    user.stage = 'pedir para digitar um numero para add mais'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.buttonsResponseMessage.selectedButtonId === 'naoAddNumVazio' && userInfo.bot === true) {
                    user.stage = 'eu mulher ja cadastrado'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.buttonsResponseMessage.selectedButtonId === 'voltar para menu' && userInfo.bot === true) {
                    user.stage = 'eu mulher ja cadastrado'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.buttonsResponseMessage.selectedButtonId === 'maisopções' && userInfo.bot === true) {
                    user.stage = 'outras opções anjo guardião'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.buttonsResponseMessage.selectedButtonId === 'Limpar lista' && userInfo.bot === true) {
                    await depoimentoRef.update({
                        numerosAnjo: FieldValue.delete()
                    });
                    user.numerosAnjo = []
                    user.stage = 'escolheu anjo da guarda vazio'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.buttonsResponseMessage.selectedButtonId === 'Eu voluntário' && userInfo.bot === true) {
                    user.stage = 'entrou no eu voluntario'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.buttonsResponseMessage.selectedButtonId === 'Canais de denuncia 2' && userInfo.bot === true) {
                    user.stage = 'entrou no Canais de denuncia 2'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.buttonsResponseMessage.selectedButtonId === 'disque emergencia 2' && userInfo.bot === true) {
                    user.stage = 'entrou no disque emergencia 2'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.buttonsResponseMessage.selectedButtonId === 'dununcia 2' || msg.message.buttonsResponseMessage.selectedButtonId === 'Denunciar novamente 2' && userInfo.bot === true) {
                    user.stage = 'entrou no dununcia 2'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.buttonsResponseMessage.selectedButtonId === 'SimEnviardenuncia2' && userInfo.bot === true) {
                    await depoimentoRef.update({
                        depoimentos: FieldValue.arrayUnion({
                            depoimento: user.denuncia2,
                            hora: `${horarioAtual}`

                        })
                    });
                    await depoimentoRef2.set({
                        numero: numero,
                        depoimento: user.denuncia2,
                        hora: Timestamp.fromDate(new Date()),
                        nomeCompleto: userInfo.nome,
                        apedido: userInfo.apelido,
                        cep: userInfo.cep,
                        bairro: userInfo.bairro,
                        rua: userInfo.rua,
                        dataN: userInfo.dataN,
                        email: userInfo.email,
                        mes: currentMonth

                    });
                    await quantidadeDenuncia.update({
                        numero: FieldValue.increment(1),

                    });

                    user.stage = 'denuncia 2 enviada'
                    user.denuncia2 = ''
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.buttonsResponseMessage.selectedButtonId === 'NãoEnviardenuncia2' && userInfo.bot === true) {
                    user.stage = 'denuncia 2 não enviada'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.buttonsResponseMessage.selectedButtonId === 'Eu apoio' && userInfo.bot === true) {
                    user.stage = 'entrou em eu apoio'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                    const sections = [
                        {
                            title: "Opções",
                            rows: [
                                { title: "Eu empresa", rowId: "Eu empresa", description: "Quero fazer parte do programa de rede de apoio e acolhimento as mulheres em estado de vulnerabilidade de violència." },
                                { title: "Eu embaixador", rowId: "Eu embaixador", description: "Quero fazer parte do programa de rede de apoio e acolhimento as mulheres em estado de vulnerabilidade de violència." },
                                // { title: "Publicidade social", rowId: "Publicidade social", description: "Quero fazer parte do programa de rede de apoio e acolhimento as mulheres em estado de vulnerabilidade de violència." }
                            ]
                        },

                    ]

                    const listMessage = {
                        text: "Escolha uma das opções abaixo!",
                        footer: "",
                        title: "",
                        buttonText: "Clique Aqui!",
                        sections
                    }

                    await SendMessage(jid, listMessage)
                }
                if (msg.message.buttonsResponseMessage.selectedButtonId === 'nãoDadosEmpresa' && userInfo.bot === true) {
                    user.nome_empresa = ''
                    user.endereco_empresa = ''
                    user.cep_empresa = ''
                    user.email_empresa = ''
                    user.ramo_de_atividade = ''
                    user.stage = 'Cancelou o cadastro da empresa'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.buttonsResponseMessage.selectedButtonId === 'Eu empresabtn' && userInfo.bot === true) {
                    user.stage = 'perguntar o nome da empresa'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.buttonsResponseMessage.selectedButtonId === 'simDadosEmpresa' && userInfo.bot === true) {
                    const empresasRef = db.collection('empresas').doc(user.nome_empresa)
                    await empresasRef.set({
                        nome: user.nome_empresa,
                        endereco: user.endereco_empresa,
                        cep: user.cep_empresa,
                        email: user.email_empresa,
                        ramo: user.ramo_de_atividade,
                    });
                    // user.nome_empresa = ''
                    // user.endereco_empresa = ''
                    // user.cep_empresa = ''
                    // user.email_empresa = ''
                    // user.ramo_de_atividade = ''
                    user.stage = 'empresa cadastrada com sucesso'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.buttonsResponseMessage.selectedButtonId === 'enviar notificacao' && userInfo.bot === true) {
                    anjoRef.data().numerosAnjo.map(async data => {
                        await SendMessage(`${data}@s.whatsapp.net`, { text: 'testando' })
                    })

                    // user.stage = 'empresa cadastrada com sucesso'
                    // fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.buttonsResponseMessage.selectedButtonId === 'Acolha-me' && userInfo.bot === true) {
                    user.stage = 'O usuário entrou em Acolha-me'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.buttonsResponseMessage.selectedButtonId === 'Direitos Humanos' && userInfo.bot === true) {
                    user.stage = 'O usuário entrou em Direitos Humanos'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.buttonsResponseMessage.selectedButtonId === 'Mais opções' && userInfo.bot === true) {
                    user.stage = 'O usuário entrou em Mais opções'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.buttonsResponseMessage.selectedButtonId === 'Publicidade social' && userInfo.bot === true) {
                    user.stage = 'O usuário entrou em Publicidade social'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.buttonsResponseMessage.selectedButtonId === 'Livro Luiza-Homem' && userInfo.bot === true) {
                    user.stage = 'O usuário entrou em Livro Luiza-Homem'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.buttonsResponseMessage.selectedButtonId === 'Compartilhar Chatbot' && userInfo.bot === true) {
                    user.stage = 'O usuário entrou em Compartilhar Chatbot'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }

            }
            if (msg.message.listResponseMessage) {
                // console.log(msg.message.listResponseMessage.title)
                const gerenciador = fs.readFileSync(filePath, 'utf-8')
                const user = JSON.parse(gerenciador)
                const respList = msg.message.listResponseMessage.singleSelectReply.selectedRowId
                const respBebida = msg.message.listResponseMessage.title
                const regex = msg.message.listResponseMessage.singleSelectReply.selectedRowId
                const info = fs.readFileSync(filePath, 'utf-8')
                const userInfo = JSON.parse(info)

                if (msg.message.listResponseMessage.singleSelectReply.selectedRowId === 'Piadas ofensivas' && userInfo.stage === 'mandar a lista do diarometro' && userInfo.bot === true) {
                    user.titulo_do_dp = 'Piadas ofensivas'
                    user.nivel_do_dp = 1
                    user.stage = 'perguntar de ela deseja descrever Piadas ofensivas'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.listResponseMessage.singleSelectReply.selectedRowId === 'Chantagem' && userInfo.stage === 'mandar a lista do diarometro' && userInfo.bot === true) {
                    user.titulo_do_dp = (respList)
                    user.nivel_do_dp = 2
                    user.stage = 'perguntar de ela deseja descrever Chantagem'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.listResponseMessage.singleSelectReply.selectedRowId === 'Mentir - Enganar' && userInfo.stage === 'mandar a lista do diarometro' && userInfo.bot === true) {
                    user.titulo_do_dp = (respList)
                    user.nivel_do_dp = 3
                    user.stage = 'perguntar de ela deseja descrever Mentir - Enganar'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.listResponseMessage.singleSelectReply.selectedRowId === 'Culpar' && userInfo.stage === 'mandar a lista do diarometro' && userInfo.bot === true) {
                    user.titulo_do_dp = (respList)
                    user.nivel_do_dp = 4
                    user.stage = 'perguntar de ela deseja descrever Culpar'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.listResponseMessage.singleSelectReply.selectedRowId === 'Desqualificar' && userInfo.stage === 'mandar a lista do diarometro' && userInfo.bot === true) {
                    user.titulo_do_dp = (respList)
                    user.nivel_do_dp = 5
                    user.stage = 'perguntar de ela deseja descrever Desqualificar'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.listResponseMessage.singleSelectReply.selectedRowId === 'Ridicularizar - Ofender' && userInfo.stage === 'mandar a lista do diarometro' && userInfo.bot === true) {
                    user.titulo_do_dp = (respList)
                    user.nivel_do_dp = 6
                    user.stage = 'perguntar de ela deseja descrever Ridicularizar - Ofender'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.listResponseMessage.singleSelectReply.selectedRowId === 'Humilhar em publico' && userInfo.stage === 'mandar a lista do diarometro' && userInfo.bot === true) {
                    user.titulo_do_dp = (respList)
                    user.nivel_do_dp = 7
                    user.stage = 'perguntar de ela deseja descrever Humilhar em publico'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.listResponseMessage.singleSelectReply.selectedRowId === 'Controlar - proibir' && userInfo.stage === 'mandar a lista do diarometro' && userInfo.bot === true) {
                    user.titulo_do_dp = 'Controlar - proibir'
                    user.nivel_do_dp = 8
                    user.stage = 'perguntar de ela deseja descrever Controlar - proibir'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.listResponseMessage.singleSelectReply.selectedRowId === 'Intimidar - ameaçar' && userInfo.stage === 'mandar a lista do diarometro' && userInfo.bot === true) {
                    user.titulo_do_dp = 'Intimidar - ameaçar'
                    user.nivel_do_dp = 9
                    user.stage = 'perguntar de ela deseja descrever Intimidar - ameaçar'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.listResponseMessage.singleSelectReply.selectedRowId === 'Expor a vida intima' && userInfo.stage === 'mandar a lista do diarometro' && userInfo.bot === true) {
                    user.titulo_do_dp = 'Expor a vida intima'
                    user.nivel_do_dp = 10
                    user.stage = 'perguntar de ela deseja descrever Expor a vida intima'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.listResponseMessage.singleSelectReply.selectedRowId === 'Destruir bens pessoais' && userInfo.stage === 'mandar a lista do diarometro' && userInfo.bot === true) {
                    user.titulo_do_dp = 'Destruir bens pessoais'
                    user.nivel_do_dp = 11
                    user.stage = 'perguntar de ela deseja descrever Destruir bens pessoais'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.listResponseMessage.singleSelectReply.selectedRowId === 'Machucar - Sacudir' && userInfo.stage === 'mandar a lista do diarometro' && userInfo.bot === true) {
                    user.titulo_do_dp = 'Machucar - Sacudir'
                    user.nivel_do_dp = 12
                    user.stage = 'perguntar de ela deseja descrever Machucar - Sacudir'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.listResponseMessage.singleSelectReply.selectedRowId === 'Brincar de bater' && userInfo.stage === 'mandar a lista do diarometro' && userInfo.bot === true) {
                    user.titulo_do_dp = 'Brincar de bater'
                    user.nivel_do_dp = 13
                    user.stage = 'perguntar de ela deseja descrever Brincar de bater'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.listResponseMessage.singleSelectReply.selectedRowId === 'Empurrar' && userInfo.stage === 'mandar a lista do diarometro' && userInfo.bot === true) {
                    user.titulo_do_dp = 'Empurrar'
                    user.nivel_do_dp = 14
                    user.stage = 'perguntar de ela deseja descrever Empurrar'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.listResponseMessage.singleSelectReply.selectedRowId === 'Xingar' && userInfo.stage === 'mandar a lista do diarometro' && userInfo.bot === true) {
                    user.titulo_do_dp = 'Xingar'
                    user.nivel_do_dp = 15
                    user.stage = 'perguntar de ela deseja descrever Xingar'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.listResponseMessage.singleSelectReply.selectedRowId === 'Diminuir a autoestima' && userInfo.stage === 'mandar a lista do diarometro' && userInfo.bot === true) {
                    user.titulo_do_dp = 'Diminuir a autoestima'
                    user.nivel_do_dp = 16
                    user.stage = 'perguntar de ela deseja descrever Diminuir a autoestima'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                // if (msg.message.listResponseMessage.singleSelectReply.selectedRowId === 'Diminuir a autoestima' && userInfo.stage === 'mandar a lista do diarometro' && userInfo.bot === true) {
                //     user.titulo_do_dp = (respList)
                //     user.nivel_do_dp = 16
                //     user.stage = 'perguntar de ela deseja descrever Diminuir a autoestima'
                //     fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                // }
                if (msg.message.listResponseMessage.singleSelectReply.selectedRowId === 'Impedir de prevenir a gravidez' && userInfo.stage === 'mandar a lista do diarometro' && userInfo.bot === true) {
                    user.titulo_do_dp = 'Impedir de prevenir a gravidez'
                    user.nivel_do_dp = 17
                    user.stage = 'perguntar de ela deseja descrever Impedir de prevenir a gravidez'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.listResponseMessage.singleSelectReply.selectedRowId === 'Dar tapas' && userInfo.stage === 'mandar a lista do diarometro' && userInfo.bot === true) {
                    user.titulo_do_dp = 'Dar tapas'
                    user.nivel_do_dp = 18
                    user.stage = 'perguntar de ela deseja descrever Dar tapas'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.listResponseMessage.singleSelectReply.selectedRowId === 'Chutar' && userInfo.stage === 'mandar a lista do diarometro' && userInfo.bot === true) {
                    user.titulo_do_dp = 'Chutar'
                    user.nivel_do_dp = 19
                    user.stage = 'perguntar de ela deseja descrever Chutar'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.listResponseMessage.singleSelectReply.selectedRowId === 'Confinar - Prender' && userInfo.stage === 'mandar a lista do diarometro' && userInfo.bot === true) {
                    user.titulo_do_dp = 'Confinar - Prender'
                    user.nivel_do_dp = 20
                    user.stage = 'perguntar de ela deseja descrever Confinar - Prender'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.listResponseMessage.singleSelectReply.selectedRowId === 'Ameaçar com objetos ou armas' && userInfo.stage === 'mandar a lista do diarometro' && userInfo.bot === true) {
                    user.titulo_do_dp = 'Ameaçar com objetos ou armas'
                    user.nivel_do_dp = 21
                    user.stage = 'perguntar de ela deseja descrever Ameaçar com objetos ou armas'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.listResponseMessage.singleSelectReply.selectedRowId === 'Forçar relação sexual' && userInfo.stage === 'mandar a lista do diarometro' && userInfo.bot === true) {
                    user.titulo_do_dp = 'Forçar relação sexual'
                    user.nivel_do_dp = 22
                    user.stage = 'perguntar de ela deseja descrever Forçar relação sexual'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.listResponseMessage.singleSelectReply.selectedRowId === 'Obrigar a abortar' && userInfo.stage === 'mandar a lista do diarometro' && userInfo.bot === true) {
                    user.titulo_do_dp = 'Obrigar a abortar'
                    user.nivel_do_dp = 23
                    user.stage = 'perguntar de ela deseja descrever Obrigar a abortar'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.listResponseMessage.singleSelectReply.selectedRowId === 'Causar lesão corporal grave - Mutilar' && userInfo.stage === 'mandar a lista do diarometro' && userInfo.bot === true) {
                    user.titulo_do_dp = 'Causar lesão corporal grave - Mutilar'
                    user.nivel_do_dp = 24
                    user.stage = 'perguntar de ela deseja descrever Causar lesão corporal grave - Mutilar'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.listResponseMessage.singleSelectReply.selectedRowId === 'Ameaçar de morte' && userInfo.stage === 'mandar a lista do diarometro' && userInfo.bot === true) {
                    user.titulo_do_dp = 'Ameaçar de morte'
                    user.nivel_do_dp = 25
                    user.stage = 'perguntar de ela deseja descrever Ameaçar de morte'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.listResponseMessage.singleSelectReply.selectedRowId === 'MATAR' && userInfo.stage === 'mandar a lista do diarometro' && userInfo.bot === true) {
                    user.titulo_do_dp = 'MATAR'
                    user.nivel_do_dp = 26
                    user.stage = 'perguntar de ela deseja descrever MATAR'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.listResponseMessage.singleSelectReply.selectedRowId === 'Eu embaixador' && userInfo.nomeEmbaixador === '' && userInfo.bot === true) {
                    user.stage = 'Perguntar o nome do embaixador'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.listResponseMessage.singleSelectReply.selectedRowId === 'Eu embaixador' && userInfo.bot === true) {
                    user.stage = 'Perguntar o nome do embaixador'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }

                if (msg.message.listResponseMessage.title === 'Eu empresa' && userInfo.bot === true) {
                    user.stage = 'perguntar o nome da empresa'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
            }
            if (msg.message.conversation) {
                const mensagem = msg.message.conversation
                console.log(msg.message.conversation)
                const gerenciador = fs.readFileSync(filePath, 'utf-8')
                const user = JSON.parse(gerenciador)
                const info = fs.readFileSync(filePath, 'utf-8')
                const userInfo = JSON.parse(info)
                switch (userInfo.stage) {
                    case 'perguntar nome':
                        user.nome = (msg.message.conversation)
                        user.stage = 'perguntar apelido'
                        fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        break;
                    case 'perguntar apelido':
                        user.apelido = (msg.message.conversation)
                        user.stage = 'perguntar cep'
                        fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        break;
                    case 'perguntar cep':
                        cep(msg.message.conversation)
                            .then((result) => {
                                console.log(result)
                                user.estado = (result.state);
                                user.cidade = (result.city);
                                user.bairro = (result.neighborhood);
                                user.rua = (result.street);
                                user.cep = (msg.message.conversation)
                                fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                            })
                            .catch((error) => {
                                console.log(error);
                                SendMessage(jid, { text: 'CEP NAO ENCONTRADO' })
                            });
                        user.stage = 'perguntar numero'
                        fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        break;
                    case 'perguntar numero':
                        user.numeroResidencia = msg.message.conversation
                        user.stage = 'perguntar data de nascimento'
                        fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        break
                    case 'perguntar data de nascimento':
                        user.dataN = (msg.message.conversation)
                        user.stage = 'perguntar email'
                        fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')

                        break;
                    case 'perguntar email':
                        await docRef.set({
                            nomeCompleto: userInfo.nome,
                            apedido: userInfo.apelido,
                            cep: userInfo.cep,
                            bairro: userInfo.bairro,
                            cidade: userInfo.cidade,
                            estado: userInfo.estado,
                            numero: numero,
                            rua: userInfo.rua,
                            dataN: userInfo.dataN,
                            email: msg.message.conversation
                        });
                        user.email = (msg.message.conversation)
                        user.stage = 'confirmar cadastro'
                        fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        break
                    case 'denuncia para mim mesmo':
                        user.depoimentos = msg.message.conversation
                        user.stage = 'pergunta se quer enviar o depoimento'
                        fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        break
                    case 'escolheu enviar uma denuncia diarometro':
                        user.dp_diarometro = msg.message.conversation
                        user.depoimentos_diarometro.push(userInfo.nivel_do_dp + '-' + msg.message.conversation)
                        user.stage = 'pergunta se quer enviar o depoimento diarometro'
                        fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        break
                    case 'Perguntar o nome do embaixador':
                        user.nomeEmbaixador = (msg.message.conversation)
                        user.stage = 'perguntar o cep do Embaixador'
                        fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        break
                    case 'pedir para digitar um numero para add':
                        user.numeroAnjo = (msg.message.conversation)
                        user.stage = 'confirmar o numero adcionado vazio'
                        fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        break
                    case 'denuncia Para terceiros':
                        user.nome_terceiros = msg.message.conversation
                        user.stage = 'perguntar onde ocorreu'
                        fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        break
                    case 'perguntar onde ocorreu':
                        user.local_ocorrido = msg.message.conversation
                        user.stage = 'escrever texto do depoimento'
                        fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        break
                    case 'escrever texto do depoimento':
                        await depoimentoRef.update({
                            depoimentosTerceiros: FieldValue.arrayUnion({
                                depoimento: msg.message.conversation,
                                local: userInfo.local_ocorrido,
                                nome: userInfo.nome_terceiros,
                                hora: `${horarioAtual}`
                            })
                        });
                        await depoimentoRef2.set({
                            numero: numero,
                            depoimento: msg.message.conversation,
                            local: userInfo.local_ocorrido,
                            nome: userInfo.nome_terceiros,
                            hora: Timestamp.fromDate(new Date()),
                            nomeCompleto: userInfo.nome,
                            apedido: userInfo.apelido,
                            cep: userInfo.cep,
                            bairro: userInfo.bairro,
                            rua: userInfo.rua,
                            dataN: userInfo.dataN,
                            email: msg.message.conversation,
                            mes: currentMonth
                        });
                        await quantidadeDenuncia.update({
                            numero: FieldValue.increment(1),

                        });
                        user.depoimentos_terceiros = ''
                        user.nome_terceiros = ''
                        user.local_ocorrido = ''
                        user.stage = 'perguntar fluxo'
                        fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        break
                    case 'entrou no dununcia 2':
                        user.denuncia2 = msg.message.conversation
                        user.stage = 'pergunta se quer enviar a denuncia'
                        fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        break
                    case 'perguntar o nome da empresa':
                        user.nome_empresa = msg.message.conversation
                        user.stage = 'pergunta o endereço da empresa'
                        fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        break
                    case 'pergunta o endereço da empresa':
                        user.endereco_empresa = msg.message.conversation
                        user.stage = 'pergunta o cep da empresa'
                        fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        break
                    case 'pergunta o cep da empresa':
                        user.cep_empresa = msg.message.conversation
                        user.stage = 'pergunta o email da empresa'
                        fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        break
                    case 'pergunta o email da empresa':
                        user.email_empresa = msg.message.conversation
                        user.stage = 'pergunta o ramo da empresa'
                        fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        break
                    case 'pergunta o ramo da empresa':
                        user.ramo_de_atividade = msg.message.conversation
                        user.stage = 'confirmar dados da empresa'
                        fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        break
                    case 'perguntar o cep do Embaixador':
                        user.cepEmbaixador = msg.message.conversation
                        user.stage = 'perguntar data de nascimento do embaixador'
                        fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        break
                    case 'perguntar data de nascimento do embaixador':
                        user.dataEmbaixador = (msg.message.conversation)
                        user.stage = 'perguntar email do embaixador'
                        fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        break
                    case 'perguntar email do embaixador':
                        await depoimentoRef.update({
                            embaixadores: FieldValue.arrayUnion({
                                nome: userInfo.nomeEmbaixador,
                                dataN: userInfo.dataEmbaixador,
                                email: msg.message.conversation,
                                endereco: userInfo.cep_empresa,
                                hora: `${horarioAtual}`
                            })
                        });
                        user.emailEmbaixador = (msg.message.conversation)
                        user.stage = 'Embaxador cadastrado com sucesso'
                        fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        break
                    case 'O usuário entrou em Acolha-me':
                        user.stage = 'inicial'
                        fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        break
                    case 'inicial':
                        if (mensagem === '1') {
                            if (userInfo.email !== '') {
                                user.stage = 'eu mulher ja cadastrado'
                                fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                            } else {
                                user.stage = 'perguntar nome'
                                fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                            }
                        } else if (mensagem === '2') {
                            user.stage = 'entrou no eu voluntario'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem === '3') {
                            user.stage = 'O usuário entrou em Mais opções'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }

                        break
                    case 'confirmar cadastro':
                        if (mensagem === '1') {
                            user.stage = 'escolheu canais de denuncia'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }
                        // else if (mensagem === '2') {
                        //     user.stage = 'mandar a lista do diarometro'
                        //     fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        // } 
                        else if (mensagem === '2') {
                            if (userInfo.numerosAnjo.length !== 0) {
                                user.stage = 'confirmou o numero que digitou'
                                fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                            } else if (userInfo.numerosAnjo.length === 0) {
                                user.stage = 'escolheu anjo da guarda vazio'
                                fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                            }
                        }
                        break
                    case 'escolheu canais de denuncia':
                        if (mensagem === '1') {
                            user.stage = 'mandar lista de numeros de emergencia'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem === '2') {
                            user.stage = 'escolheu denuncia'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem === '3') {
                            user.stage = 'mandar o papel de parede'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }
                        break
                    case 'mandar lista de numeros de emergencia':
                        user.stage = 'inicial'
                        fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        break
                    case 'eu mulher ja cadastrado':
                        if (mensagem === '1') {
                            user.stage = 'escolheu canais de denuncia'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }
                        // else if (mensagem === '2') {
                        //     user.stage = 'mandar a lista do diarometro'
                        //     fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        // } 
                        else if (mensagem === '3') {
                            if (userInfo.numerosAnjo.length !== 0) {
                                user.stage = 'confirmou o numero que digitou'
                                fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                            } else if (userInfo.numerosAnjo.length === 0) {
                                user.stage = 'escolheu anjo da guarda vazio'
                                fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                            }
                        }
                        break
                    case 'escolheu denuncia':
                        if (mensagem === '1') {
                            user.stage = 'denuncia para mim mesmo'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem === '2') {
                            user.stage = 'denuncia Para terceiros'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }

                        break
                    case 'pergunta se quer enviar o depoimento':
                        if (mensagem.toLocaleLowerCase() == "sim") {
                            await depoimentoRef.update({
                                depoimentos: FieldValue.arrayUnion({
                                    depoimento: userInfo.depoimentos,
                                    hora: `${horarioAtual}`
                                })
                            });
                            await depoimentoRef2.set({
                                numero: numero,
                                depoimento: userInfo.depoimentos,
                                hora: Timestamp.fromDate(new Date()),
                                nomeCompleto: userInfo.nome,
                                apedido: userInfo.apelido,
                                cep: userInfo.cep,
                                bairro: userInfo.bairro,
                                rua: userInfo.rua,
                                dataN: userInfo.dataN,
                                email: msg.message.conversation,
                                mes: currentMonth

                            });
                            await quantidadeDenuncia.update({
                                numero: FieldValue.increment(1),

                            });
                            user.depoimentos = ''
                            user.stage = 'perguntar fluxo'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem.toLocaleLowerCase() == "não") {
                            user.stage = 'cancelou o depoimento'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }
                        break
                    case 'cancelou o depoimento':
                        if (mensagem === '1') {
                            user.stage = 'escolheu denuncia'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem === '2') {
                            user.stage = 'inicial'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }
                        break
                    case 'perguntar fluxo':
                        if (mensagem === '1') {
                            user.stage = 'escolheu denuncia'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem === '2') {
                            user.stage = 'inicial'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }
                        break
                    case 'mandar o papel de parede':
                        if (mensagem.toLocaleLowerCase() == "sim") {
                            user.stage = 'escolheu denuncia'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem.toLocaleLowerCase() == "não") {
                            user.stage = 'cancelou o depoimento'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }
                        break
                    case 'confirmou o numero que digitou':
                        if (mensagem === '1') {
                            console.log('ta aqui')
                            anjoRef.data().numerosAnjo.map(async data => {
                                await SendMessage(`${data}@s.whatsapp.net`, { text: 'testando' })
                                await SendMessage(jid, { text: 'notificação enviada com sucesso!' })
                            })
                            user.stage = 'inicial'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem === '2') {
                            user.stage = 'inicial'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem === '3') {
                            user.stage = 'outras opções anjo guardião'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }
                        break
                    case 'escolheu anjo da guarda vazio':
                        if (mensagem.toLocaleLowerCase() == "sim") {
                            user.stage = 'pedir para digitar um numero para add'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem.toLocaleLowerCase() == "não") {
                            user.stage = 'eu mulher ja cadastrado'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }
                        break
                    case 'pedir para digitar um numero para add':
                        if (mensagem.toLocaleLowerCase() == "sim") {
                            await depoimentoRef.update({
                                numerosAnjo: FieldValue.arrayUnion(userInfo.numeroAnjo)
                            });
                            user.numerosAnjo.push(userInfo.numeroAnjo)

                            user.stage = 'confirmou o numero que digitou'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem.toLocaleLowerCase() == "não") {
                            user.stage = 'eu mulher ja cadastrado'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }
                        break
                    case 'confirmar o numero adcionado vazio':
                        await depoimentoRef.update({
                            numerosAnjo: FieldValue.arrayUnion(userInfo.numeroAnjo)
                        });
                        user.numerosAnjo.push(userInfo.numeroAnjo)

                        user.stage = 'confirmou o numero que digitou'
                        fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        break
                    case 'outras opções anjo guardião':
                        if (mensagem === '1') {
                            user.stage = 'pedir para digitar um numero para add'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem === '2') {
                            await depoimentoRef.update({
                                numerosAnjo: FieldValue.delete()
                            });
                            user.numerosAnjo = []
                            user.stage = 'escolheu anjo da guarda vazio'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem === '3') {
                            user.stage = 'inicial'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }
                        break
                    case 'entrou no eu voluntario':
                        if (mensagem === '1') {
                            user.stage = 'entrou no Canais de denuncia 2'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem === '2') {
                            user.stage = 'entrou em eu apoio'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem === '3') {

                        }
                        break
                    case 'entrou no Canais de denuncia 2':
                        if (mensagem === '1') {
                            user.stage = 'entrou no disque emergencia 2'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem === '2') {
                            user.stage = 'entrou no dununcia 2'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem === '3') {
                            user.stage = 'O usuário entrou em Direitos Humanos'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }
                        break
                    case 'entrou no disque emergencia 2':
                        user.stage = 'inicial'
                        fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        break
                    case 'pergunta se quer enviar a denuncia':
                        if (mensagem.toLocaleLowerCase() == "sim") {
                            await depoimentoRef.update({
                                depoimentos: FieldValue.arrayUnion({
                                    depoimento: user.denuncia2,
                                    hora: `${horarioAtual}`

                                })
                            });
                            await depoimentoRef2.set({
                                numero: numero,
                                depoimento: user.denuncia2,
                                hora: Timestamp.fromDate(new Date()),
                                nomeCompleto: userInfo.nome,
                                apedido: userInfo.apelido,
                                cep: userInfo.cep,
                                bairro: userInfo.bairro,
                                rua: userInfo.rua,
                                dataN: userInfo.dataN,
                                email: userInfo.email,
                                mes: currentMonth

                            });
                            await quantidadeDenuncia.update({
                                numero: FieldValue.increment(1),

                            });

                            user.stage = 'denuncia 2 enviada'
                            user.denuncia2 = ''
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem.toLocaleLowerCase() == "não") {
                            user.stage = 'denuncia 2 não enviada'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }
                        break
                    case 'denuncia 2 enviada':
                        user.stage = 'inicial'
                        fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        break
                    case 'denuncia 2 não enviada':
                        user.stage = 'inicial'
                        fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        break
                    case 'O usuário entrou em Direitos Humanos':
                        user.stage = 'inicial'
                        fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        break
                    case 'entrou em eu apoio':
                        if (mensagem === "1") {
                            user.stage = 'perguntar o nome da empresa'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem === "2") {
                            user.stage = 'Perguntar o nome do embaixador'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }
                        break
                    case 'confirmar dados da empresa':
                        if (mensagem.toLocaleLowerCase() == "sim") {
                            const empresasRef = db.collection('empresas').doc(user.nome_empresa)
                            await empresasRef.set({
                                nome: user.nome_empresa,
                                endereco: user.endereco_empresa,
                                cep: user.cep_empresa,
                                email: user.email_empresa,
                                ramo: user.ramo_de_atividade,
                            });
                            // user.nome_empresa = ''
                            // user.endereco_empresa = ''
                            // user.cep_empresa = ''
                            // user.email_empresa = ''
                            // user.ramo_de_atividade = ''
                            user.stage = 'empresa cadastrada com sucesso'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem.toLocaleLowerCase() == "não") {
                            user.nome_empresa = ''
                            user.endereco_empresa = ''
                            user.cep_empresa = ''
                            user.email_empresa = ''
                            user.ramo_de_atividade = ''
                            user.stage = 'Cancelou o cadastro da empresa'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }
                        break
                    case 'empresa cadastrada com sucesso':
                        user.stage = 'inicial'
                        fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        break
                    case 'Cancelou o cadastro da empresa':
                        user.stage = 'inicial'
                        fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        break
                    case 'Embaxador cadastrado com sucesso':
                        user.stage = 'inicial'
                        fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        break
                    case 'O usuário entrou em Mais opções':
                        if (mensagem === '1') {
                            await SendMessage(jid, { text: '🙋🏻‍♀️Olá,  como vai você?\nPermita me apresentar...\n*Sou a Luzia-Homem.*\nMas pode  me chamar de *Luzia*.\nFui criada no imaginário do meu autor e escritor Domingos Olimpio no século XlX na cidade de Sobral - Ceará\nComo vítima da seca, e do êxodo rural/retirante, sofri  preconceitos e violência sexual até  chegar num  feminicidio( nos dias de hoje)\nhoje estou nesta causa *Não  a violência contra a mulher* graças a *IA* inteligência artificial/*chatGPT* e ao meu *CEO*  Criador e idealizador que me resgatou do século XlX e me faz uma honrosa  homenagem e uma profunda reflexão para os dias de hoje.\ncom a missão de convocar toda uma sociedade para se unir em prol desta causa e criar a maior rede de Proteção, apoio e acolhimento.\nOrientar, informar, educar e dar empoderamento  as mulheres e representa-las como embaixadora virtual  da  Plataforma digital que leva o meu nome: Diário de Luzia.   projeto: *Eu acolho e Acolha-me* uma rede de Proteção, apoio e acolhimento a todas as mulheres vítimas de violência e vulnerabilidade social.\nVi que ao longo dos séculos o mundo se modernizou e evoluiu,  mas o preconceito, machismo , violência, feminicidio contra as mulheres ainda permanece no mundo!\nAs mulheres\nContinuam passando por tudo que passei !!!\nCom isso  lhe convido a nos unirmos contra esse problema social que perpetua até hoje e  é  problema de todos.\nPara me conhecer melhor, sobre minha história de vida/biografia,  recomendo ler o meu livro LUZIA HOMEM,\nOu escutar Áudio Livro.' })
                            await SendMessage(jid, { text: '🙋🏻‍♀️ Estou sempre disponível para conversar com você, 24 horas por dia, 7 dias por semana, Lembre-se :\n*QUEM TE PROTEGE NUNCA DORME !*' })
                            await SendMessage(jid, { text: '💬 Além disso, eu posso conversar com você sobre praticamente qualquer assunto, desde temas mais leves e informais até assuntos mais complexos e técnicos.\nMais aqui vamos dar prioridade e  relevancia para assuntos relacionados a causa *Não a violência contra a mulher.*\n\n\n\n*🙋🏻‍♀️ Veja abaixo alguns exemplos de assuntos que são  relevantes me abordar ou dialogar  para seu conhecimento e se manter ciente e segura  de que  você não  está sozinha nesta causa .*\n\n✍️ liste pra mim Quais as leis Brasileira que tipifica crimes contra a mulher.\n\n🖥️O que é  stalking ?\nQual a lei que tipifica crimes de stalking ?\n\nO que é  assédio ?\nQual lei que tipifica crime de assédio?\nO que é  importunação sexual ?\nQual a lei que tipifica crime de importunação sexual ?\n\n\n💭 A sua imaginação é o limite! Vamos começar? Envie sua mensagem e vamos  bater um papo ?' })
                            user.stage = 'entrou no chatgpt'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem === '2') {
                            user.stage = 'O usuário entrou em Publicidade social'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }
                        break
                    case 'entrou no chatgpt':
                        if (msg.message.conversation === 'encerrar' || msg.message.conversation === 'Encerrar') {
                            user.stage = 'inicial'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else {
                            try {
                                const msgChatGPT = msg.message.conversation
                                const index = msgChatGPT?.indexOf(" ");
                                const question = msgChatGPT?.substring(index ? + 1 : 1);
                                // mensagem de texto


                                getDavinciResponse(question).then(async (response) => {
                                    await SendMessage(jid, { text: response })
                                        .then(result => console.log('RESULT: ', result))
                                        .catch(err => console.log('ERROR: ', err))
                                    await SendMessage(jid, { text: 'Digite *encerrar* caso deseje finalizar a conversa.' })
                                })
                                const buttons = [
                                    { buttonId: 'Menu inicial', buttonText: { displayText: 'Menu inicial' }, type: 1 },

                                ];


                            } catch (error) {

                            }
                        }

                        break
                    case 'O usuário entrou em Publicidade social':
                        if (mensagem === '1') {
                            user.stage = 'O usuário entrou em Compartilhar Chatbot'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem === '2') {
                            user.stage = 'inicial'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }

                        break
                    case 'O usuário entrou em Compartilhar Chatbot':
                        user.stage = 'inicial'
                        fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        break

                    case 'mandar a lista do diarometro':
                        if (mensagem === '1') {
                            user.titulo_do_dp = 'Piadas ofensivas'
                            user.nivel_do_dp = 1
                            user.stage = 'perguntar de ela deseja descrever Piadas ofensivas'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem === '2') {
                            user.titulo_do_dp = 'Chantagem'
                            user.nivel_do_dp = 2
                            user.stage = 'perguntar de ela deseja descrever Chantagem'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem === '3') {
                            user.titulo_do_dp = 'Mentir - Enganar'
                            user.nivel_do_dp = 3
                            user.stage = 'perguntar de ela deseja descrever Mentir - Enganar'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem === '4') {
                            user.titulo_do_dp = 'Culpar'
                            user.nivel_do_dp = 4
                            user.stage = 'perguntar de ela deseja descrever Culpar'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem === '5') {
                            user.titulo_do_dp = 'Desqualificar'
                            user.nivel_do_dp = 5
                            user.stage = 'perguntar de ela deseja descrever Desqualificar'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem === '6') {
                            user.titulo_do_dp = 'Ridicularizar - Ofender'
                            user.nivel_do_dp = 6
                            user.stage = 'perguntar de ela deseja descrever Ridicularizar - Ofender'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem === '7') {
                            user.titulo_do_dp = 'Humilhar em publico'
                            user.nivel_do_dp = 7
                            user.stage = 'perguntar de ela deseja descrever Humilhar em publico'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem === '8') {
                            user.titulo_do_dp = 'Controlar - proibir'
                            user.nivel_do_dp = 8
                            user.stage = 'perguntar de ela deseja descrever Controlar - proibir'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem === '9') {
                            user.titulo_do_dp = 'Intimidar - ameaçar'
                            user.nivel_do_dp = 9
                            user.stage = 'perguntar de ela deseja descrever Intimidar - ameaçar'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem === '10') {
                            user.titulo_do_dp = 'Expor a vida intima'
                            user.nivel_do_dp = 10
                            user.stage = 'perguntar de ela deseja descrever Expor a vida intima'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem === '11') {
                            user.titulo_do_dp = 'Destruir bens pessoais'
                            user.nivel_do_dp = 11
                            user.stage = 'perguntar de ela deseja descrever Destruir bens pessoais'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem === '12') {
                            user.titulo_do_dp = 'Machucar - Sacudir'
                            user.nivel_do_dp = 12
                            user.stage = 'perguntar de ela deseja descrever Machucar - Sacudir'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem === '13') {
                            user.titulo_do_dp = 'Brincar de bater'
                            user.nivel_do_dp = 13
                            user.stage = 'perguntar de ela deseja descrever Brincar de bater'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem === '14') {
                            user.titulo_do_dp = 'Empurrar'
                            user.nivel_do_dp = 14
                            user.stage = 'perguntar de ela deseja descrever Empurrar'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem === '15') {
                            user.titulo_do_dp = 'Xingar'
                            user.nivel_do_dp = 15
                            user.stage = 'perguntar de ela deseja descrever Xingar'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem === '16') {
                            user.titulo_do_dp = 'Diminuir a autoestima'
                            user.nivel_do_dp = 16
                            user.stage = 'perguntar de ela deseja descrever Diminuir a autoestima'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem === '17') {
                            user.titulo_do_dp = 'Impedir de prevenir a gravidez'
                            user.nivel_do_dp = 17
                            user.stage = 'perguntar de ela deseja descrever Impedir de prevenir a gravidez'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')

                        } else if (mensagem === '18') {
                            user.titulo_do_dp = 'Dar tapas'
                            user.nivel_do_dp = 18
                            user.stage = 'perguntar de ela deseja descrever Dar tapas'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem === '19') {
                            user.titulo_do_dp = 'Chutar'
                            user.nivel_do_dp = 19
                            user.stage = 'perguntar de ela deseja descrever Chutar'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem === '20') {
                            user.titulo_do_dp = 'Confinar - Prender'
                            user.nivel_do_dp = 20
                            user.stage = 'perguntar de ela deseja descrever Confinar - Prender'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem === '21') {
                            user.titulo_do_dp = 'Ameaçar com objetos ou armas'
                            user.nivel_do_dp = 21
                            user.stage = 'perguntar de ela deseja descrever Ameaçar com objetos ou armas'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem === '22') {
                            user.titulo_do_dp = 'Forçar relação sexual'
                            user.nivel_do_dp = 22
                            user.stage = 'perguntar de ela deseja descrever Forçar relação sexual'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem === '23') {
                            user.titulo_do_dp = 'Obrigar a abortar'
                            user.nivel_do_dp = 23
                            user.stage = 'perguntar de ela deseja descrever Obrigar a abortar'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem === '24') {
                            user.titulo_do_dp = 'Causar lesão corporal grave - Mutilar'
                            user.nivel_do_dp = 24
                            user.stage = 'perguntar de ela deseja descrever Causar lesão corporal grave - Mutilar'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem === '25') {
                            user.titulo_do_dp = 'Ameaçar de morte'
                            user.nivel_do_dp = 25
                            user.stage = 'perguntar de ela deseja descrever Ameaçar de morte'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem === '26') {
                            user.titulo_do_dp = 'MATAR'
                            user.nivel_do_dp = 26
                            user.stage = 'perguntar de ela deseja descrever MATAR'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }

                        break
                    case 'perguntar de ela deseja descrever Piadas ofensivas':
                        if (mensagem.toLocaleLowerCase() == "sim") {
                            user.stage = 'escolheu enviar uma denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem.toLocaleLowerCase() == "não") {
                            user.stage = 'escolheu nao enviar denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }
                        break
                    case 'pergunta se quer enviar o depoimento diarometro':
                        if (mensagem.toLocaleLowerCase() == "sim") {
                            const diarometroDenuncia = db.collection('contador').doc('denuncias')
                            await depoimentoRef.update({
                                diarometro: FieldValue.arrayUnion({
                                    depoimento: userInfo.dp_diarometro,
                                    titulo: userInfo.titulo_do_dp,
                                    nivel: userInfo.nivel_do_dp,
                                    hora: `${horarioAtual}`
                                })
                            });
                            await depoimentoRef2.set({
                                depoimento: userInfo.dp_diarometro,
                                titulo: userInfo.titulo_do_dp,
                                nivel: userInfo.nivel_do_dp,
                                hora: Timestamp.fromDate(new Date()),
                                nomeCompleto: userInfo.nome,
                                apedido: userInfo.apelido,
                                cep: userInfo.cep,
                                bairro: userInfo.bairro,
                                rua: userInfo.rua,
                                dataN: userInfo.dataN,
                                email: userInfo.email,
                                mes: currentMonth
                            });
                            await diarometro.set({
                                numero: numero,
                                depoimento: userInfo.dp_diarometro,
                                titulo: userInfo.titulo_do_dp,
                                nivel: userInfo.nivel_do_dp,
                                hora: `${horarioAtual}`
                            });
                            await quantidadeDenuncia.update({
                                numero: FieldValue.increment(1),
                                [userInfo.titulo_do_dp]: FieldValue.increment(1),
                            });

                            user.stage = 'dp diarometro enviado com sucesso';
                            user.depoimentos_diarometro = []
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem.toLocaleLowerCase() == "não") {
                            user.nivel_do_dp = ''
                            user.depoimentos_diarometro = []
                            user.stage = 'escolheu nao enviar denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }

                        break
                    case 'dp diarometro enviado com sucesso':
                        if (mensagem === '1') {
                            user.stage = 'mandar a lista do diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem === '2') {
                            user.stage = 'inicial'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }
                        break
                    case 'escolheu nao enviar denuncia diarometro':
                        if (mensagem === '1') {
                            user.stage = 'mandar a lista do diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem === '2') {
                            user.stage = 'inicial'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }
                        break
                    case 'perguntar de ela deseja descrever Chantagem':
                        if (mensagem.toLocaleLowerCase() == "sim") {
                            user.stage = 'escolheu enviar uma denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem.toLocaleLowerCase() == "não") {
                            user.stage = 'escolheu nao enviar denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }
                        break
                    case 'perguntar de ela deseja descrever Mentir - Enganar':
                        if (mensagem.toLocaleLowerCase() == "sim") {
                            user.stage = 'escolheu enviar uma denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem.toLocaleLowerCase() == "não") {
                            user.stage = 'escolheu nao enviar denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }
                        break
                    case 'perguntar de ela deseja descrever Culpar':
                        if (mensagem.toLocaleLowerCase() == "sim") {
                            user.stage = 'escolheu enviar uma denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem.toLocaleLowerCase() == "não") {
                            user.stage = 'escolheu nao enviar denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }
                        break
                    case 'perguntar de ela deseja descrever Desqualificar':
                        if (mensagem.toLocaleLowerCase() == "sim") {
                            user.stage = 'escolheu enviar uma denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem.toLocaleLowerCase() == "não") {
                            user.stage = 'escolheu nao enviar denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }
                        break
                    case 'perguntar de ela deseja descrever Ridicularizar - Ofender':
                        if (mensagem.toLocaleLowerCase() == "sim") {
                            user.stage = 'escolheu enviar uma denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem.toLocaleLowerCase() == "não") {
                            user.stage = 'escolheu nao enviar denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }
                        break
                    case 'perguntar de ela deseja descrever Humilhar em publico':
                        if (mensagem.toLocaleLowerCase() == "sim") {
                            user.stage = 'escolheu enviar uma denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem.toLocaleLowerCase() == "não") {
                            user.stage = 'escolheu nao enviar denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }
                        break
                    case 'perguntar de ela deseja descrever Controlar - proibir':
                        if (mensagem.toLocaleLowerCase() == "sim") {
                            user.stage = 'escolheu enviar uma denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem.toLocaleLowerCase() == "não") {
                            user.stage = 'escolheu nao enviar denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }
                        break
                    case 'perguntar de ela deseja descrever Intimidar - ameaçar':
                        if (mensagem.toLocaleLowerCase() == "sim") {
                            user.stage = 'escolheu enviar uma denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem.toLocaleLowerCase() == "não") {
                            user.stage = 'escolheu nao enviar denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }
                        break
                    case 'perguntar de ela deseja descrever Expor a vida intima':
                        if (mensagem.toLocaleLowerCase() == "sim") {
                            user.stage = 'escolheu enviar uma denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem.toLocaleLowerCase() == "não") {
                            user.stage = 'escolheu nao enviar denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }
                        break
                    case 'perguntar de ela deseja descrever Destruir bens pessoais':
                        if (mensagem.toLocaleLowerCase() == "sim") {
                            user.stage = 'escolheu enviar uma denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem.toLocaleLowerCase() == "não") {
                            user.stage = 'escolheu nao enviar denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }
                        break
                    case 'perguntar de ela deseja descrever Destruir bens pessoais':
                        if (mensagem.toLocaleLowerCase() == "sim") {
                            user.stage = 'escolheu enviar uma denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem.toLocaleLowerCase() == "não") {
                            user.stage = 'escolheu nao enviar denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }
                        break
                    case 'perguntar de ela deseja descrever Machucar - Sacudir':
                        if (mensagem.toLocaleLowerCase() == "sim") {
                            user.stage = 'escolheu enviar uma denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem.toLocaleLowerCase() == "não") {
                            user.stage = 'escolheu nao enviar denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }
                        break
                    case 'perguntar de ela deseja descrever Brincar de bater':
                        if (mensagem.toLocaleLowerCase() == "sim") {
                            user.stage = 'escolheu enviar uma denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem.toLocaleLowerCase() == "não") {
                            user.stage = 'escolheu nao enviar denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }
                        break
                    case 'perguntar de ela deseja descrever Empurrar':
                        if (mensagem.toLocaleLowerCase() == "sim") {
                            user.stage = 'escolheu enviar uma denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem.toLocaleLowerCase() == "não") {
                            user.stage = 'escolheu nao enviar denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }
                        break
                    case 'perguntar de ela deseja descrever Xingar':
                        if (mensagem.toLocaleLowerCase() == "sim") {
                            user.stage = 'escolheu enviar uma denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem.toLocaleLowerCase() == "não") {
                            user.stage = 'escolheu nao enviar denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }
                        break
                    case 'perguntar de ela deseja descrever Diminuir a autoestima':
                        if (mensagem.toLocaleLowerCase() == "sim") {
                            user.stage = 'escolheu enviar uma denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem.toLocaleLowerCase() == "não") {
                            user.stage = 'escolheu nao enviar denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }
                        break
                    case 'perguntar de ela deseja descrever Impedir de prevenir a gravidez':
                        if (mensagem.toLocaleLowerCase() == "sim") {
                            user.stage = 'escolheu enviar uma denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem.toLocaleLowerCase() == "não") {
                            user.stage = 'escolheu nao enviar denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }
                        break
                    case 'perguntar de ela deseja descrever Dar tapas':
                        if (mensagem.toLocaleLowerCase() == "sim") {
                            user.stage = 'escolheu enviar uma denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem.toLocaleLowerCase() == "não") {
                            user.stage = 'escolheu nao enviar denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }
                        break
                    case 'perguntar de ela deseja descrever Chutar':
                        if (mensagem.toLocaleLowerCase() == "sim") {
                            user.stage = 'escolheu enviar uma denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem.toLocaleLowerCase() == "não") {
                            user.stage = 'escolheu nao enviar denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }
                        break
                    case 'perguntar de ela deseja descrever Confinar - Prender':
                        if (mensagem.toLocaleLowerCase() == "sim") {
                            user.stage = 'escolheu enviar uma denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem.toLocaleLowerCase() == "não") {
                            user.stage = 'escolheu nao enviar denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }
                        break
                    case 'perguntar de ela deseja descrever Ameaçar com objetos ou armas':
                        if (mensagem.toLocaleLowerCase() == "sim") {
                            user.stage = 'escolheu enviar uma denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem.toLocaleLowerCase() == "não") {
                            user.stage = 'escolheu nao enviar denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }
                        break
                    case 'perguntar de ela deseja descrever Forçar relação sexual':
                        if (mensagem.toLocaleLowerCase() == "sim") {
                            user.stage = 'escolheu enviar uma denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem.toLocaleLowerCase() == "não") {
                            user.stage = 'escolheu nao enviar denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }
                        break
                    case 'perguntar de ela deseja descrever Obrigar a abortar':
                        if (mensagem.toLocaleLowerCase() == "sim") {
                            user.stage = 'escolheu enviar uma denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem.toLocaleLowerCase() == "não") {
                            user.stage = 'escolheu nao enviar denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }
                        break
                    case 'perguntar de ela deseja descrever Causar lesão corporal grave - Mutilar':
                        if (mensagem.toLocaleLowerCase() == "sim") {
                            user.stage = 'escolheu enviar uma denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem.toLocaleLowerCase() == "não") {
                            user.stage = 'escolheu nao enviar denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }
                        break
                    case 'perguntar de ela deseja descrever Ameaçar de morte':
                        if (mensagem.toLocaleLowerCase() == "sim") {
                            user.stage = 'escolheu enviar uma denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem.toLocaleLowerCase() == "não") {
                            user.stage = 'escolheu nao enviar denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }
                        break
                    case 'perguntar de ela deseja descrever MATAR':
                        if (mensagem.toLocaleLowerCase() == "sim") {
                            user.stage = 'escolheu enviar uma denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        } else if (mensagem.toLocaleLowerCase() == "não") {
                            user.stage = 'escolheu nao enviar denuncia diarometro'
                            fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                        }
                        break




                    default:
                        console.log(`fora de qualquer stage`);
                }

            }
            if (msg.message.audioMessage) {
                const gerenciador = fs.readFileSync(filePath, 'utf-8')
                const user = JSON.parse()
                const info = fs.readFileSync(filePath, 'utf-8')
                const userInfo = JSON.parse(info)
                switch (userInfo.stage) {
                    case 'receber audio':

                        break
                    default:
                        console.log(`fora de qualquer stage`);
                }
            }
            try {
                const info = fs.readFileSync(filePath, 'utf-8')
                const userInfo = JSON.parse(info)
                console.log(userInfo.stage);

                if (userInfo.bot === true) {
                    switch (userInfo.stage) {
                        //MENSAGEM INICIAL
                        case 'inicial':
                            await SendMessage(jid, {
                                text:
                                    '👩‍⚖️ Olá' + '\n' +
                                    'Seja bem vinda ao meu mundo!' + '\n' +
                                    'Sou a LUZIA ! Sua amiga e conselheira virtual.' + '\n' +
                                    'Minha missão na terra é lutar pelo fim da violência contra a mulher.' + '\n' +
                                    'QUAL É SUA MISSÃO???' + '\n' +
                                    'Lhe convido a entrar e juntar-se comigo nessa causa.' + '\n' +
                                    'Sendo uma VÍTIMA ou VOLUNTÁRIO' + '\n' +
                                    'Entre para nossa comunidade e conheça toda nossa rede de apoio e acolhimento.' + '\n' +
                                    'LEMBRE-SE!!!' + '\n' +
                                    'você não está sozinha!' + '\n' +
                                    'Reaja em quanto há tempo! ou entre para uma legião de voluntariados que apoiam direto ou indiretamente.' + '\n\n' +
                                    '1 - 🙋‍♀️ Eu mulher 💋💄' + '\n' +
                                    '2 - ✌️ Eu voluntário' + '\n' +
                                    '3 - ➕ Mais opções'
                            })
                            break;
                        case 'perguntar nome':
                            await SendMessage(jid, { text: '🙋‍♀️\r\nQue bom ter você aqui no meu mundo virtual já vi que você é uma mulher de atitude!\r\nPara mantermos uma relação de amizade e confiança, tenho que conhecer melhor seu mundo real, preciso de algumas informações básicas de você.' })
                            await SendMessage(jid, { text: 'digite para mim seu nome completo por favor.' })
                            break;
                        case 'perguntar apelido':
                            SendMessage(jid, { text: 'Agora me diga em como você gostaria de ser chamada.' })
                            break;
                        case 'perguntar cep':
                            await SendMessage(
                                jid,
                                {
                                    image: fs.readFileSync("img/cep.jpeg"),
                                    caption: "Digite seu CEP.\n\nCaso não saiba seu CEP, clique no link abaixo para consultar.\r\n🔗📲https://buscacepinter.correios.com.br/app/endereco/index.php",
                                    gifPlayback: false
                                }
                            )
                            break;
                        case 'perguntar numero':
                            await SendMessage(jid, { text: 'Qual é o número da sua residência?' })
                            break
                        case 'perguntar data de nascimento':
                            SendMessage(jid, { text: 'Digite sua data de nascimento.\n\n*Exemplo: 24/05/1980*' })

                            break;
                        case 'perguntar email':
                            SendMessage(jid, { text: 'Digite seu E-mail.' })

                            break;
                        case 'confirmar cadastro':
                            await SendMessage(jid, { text: 'Ok, cadastro feito com sucesso!' })
                            await SendMessage(jid, {
                                text:
                                    `Parabéns ${userInfo.apelido}` + '\n' +
                                    'pela iniclativa de se mobilizar, fazendo parte de nossa comunidade e contar com toda nossa rede de apoio.' + '\n' +
                                    'a partir de agora, somos amigas e parceiras ! Sempre que precisar é só me acionar!' + '\n' +
                                    'Lembre-se.' + '\n' +
                                    'Você não está Sozinha!' + '\n' +
                                    'Quem te proteje nunca dorme.' + '\n\n' +
                                    '1 - Canais de denuncia 🆘' + '\n' +
                                    // '2 - Diarômetro 🌡️' + '\n' +
                                    '2 - Anjo da Guarda 👼'

                            });
                            break;
                        case 'escolheu canais de denuncia':

                            await SendMessage(jid, {
                                text:
                                    `Parabéns ${userInfo.apelido}` + '\n' +
                                    'pela iniclativa de se mobilizar, fazendo parte de nossa comunidade e contar com toda nossa rede de apoio.' + '\n' +
                                    'a partir de agora, somos amigas e parceiras ! Sempre que precisar é só me acionar!' + '\n' +
                                    'Lembre-se.' + '\n' +
                                    'Você não está Sozinha!' + '\n' +
                                    'Quem te proteje nunca dorme.' + '\n\n' +
                                    '1 - Disque Emergência' + '\n' +
                                    '2 - Denúncia' + '\n' +
                                    '3 - Sinal de ameaça'

                            })

                            break
                        case 'escolheu denuncia':

                            await SendMessage(jid, {
                                text:
                                    'A denúncia é...?' + '\n\n' +
                                    '1 - Para Mim Mesmo' + '\n' +
                                    '2 - Para terceiros'
                            })

                            break
                        case 'denuncia para mim mesmo': //caso a seja para mim mesmo a denuncia
                            await SendMessage(jid, { text: 'Descreva seu depoimento.\nAtenção: ⚠️🆘\nNão esqueça de procurar ajuda a pessoas  próximas e denunciar, juntar  provas, fotos, vídeos e testemunhos presenciais.\nLeve o caso as autoridades e registre o BO! (Boletim de ocorrência).' })

                            break
                        case 'denuncia Para terceiros':
                            await SendMessage(jid, { text: 'Digite o nome da vítima.' })
                            break
                        case 'escrever texto do depoimento': //pede para escrever depoimento
                            await SendMessage(jid, { text: 'Descreva seu depoimento.\nAtenção: ⚠️🆘\nNão esqueça de procurar ajuda a pessoas  próximas e denunciar, juntar  provas, fotos, vídeos e testemunhos presenciais.\nLeve o caso as autoridades e registre o BO! (Boletim de ocorrência).' })
                            break
                        case 'escrever texto do depoimento terceiros': //pede para escrever depoimento
                            await SendMessage(jid, { text: 'Escreva o ocorrido.' })
                            break
                        case 'perguntar onde ocorreu':
                            await SendMessage(jid, { text: 'Onde ocorreu?' })
                            break
                        case 'perguntar fluxo':

                            await SendMessage(jid, {
                                text:
                                    'Sua denúncia foi enviada com sucesso!' + '\n\n' +
                                    '1 - Denunciar novamente' + '\n' +
                                    '2 - Menu inicial'
                            })
                            break
                        case 'pergunta se quer enviar o depoimento':

                            await SendMessage(jid, {
                                text:
                                    'O texto acima está correto?' + '\n\n' +
                                    '*👉🏽 Sim*' + '\n' +
                                    '*👉🏽 Não*'
                            });
                            break
                        case 'confirmou o depoimento': //se o depoimento estiver correto
                            SendMessage(jid, { text: 'Sua denuncia foi enviada e será mantido o devido sigilo.' })
                            break
                        case 'cancelou o depoimento': //se o depoimento não estiver correto

                            await SendMessage(jid, {
                                text:
                                    'Sua denuncia não foi enviada.' + '\n\n' +
                                    '1 - Denunciar novamente' + '\n' +
                                    '2 - Menu inicial'
                            })

                            break
                        case 'mandar o papel de parede': //papel de parede               
                            await SendMessage(
                                jid,
                                {
                                    image: fs.readFileSync("img/quero ajudar.jpeg"),
                                    caption: "SINAL DE AMEAÇA\r\nEm caso de assédio, importunação sexual toque no X O da foto em tela cheia e mostre a uma pessoa mais próxima, PEÇA AJUDA!",
                                    gifPlayback: false
                                }

                            )
                            const buttons8 = [
                                { buttonId: 'SimEnviarPapel', buttonText: { displayText: 'Sim' }, type: 1 },
                                { buttonId: 'NãoEnviarPapel', buttonText: { displayText: 'Não' }, type: 1 },

                            ];
                            const buttonMessage8 = {
                                text: `Ok ${userInfo.apelido}, Gostaria de enviar essa denúncia as autoridades?`,
                                footer: 'Escolha uma das opções abaixo!',
                                buttons: buttons8,
                                headerType: 1
                            }
                            await SendMessage(jid, {
                                text:
                                    `Ok ${userInfo.apelido}, Gostaria de enviar essa denúncia as autoridades?` + '\n\n' +
                                    '*👉🏽 Sim*' + '\n' +
                                    '*👉🏽 Não*'
                            });
                            break
                        case 'mandar a lista do diarometro': //diarometro
                            const sections = [
                                {
                                    title: "Fique atenta! 😨.",
                                    rows: [
                                        { title: "1 - Piadas ofensivas", rowId: "Piadas ofensivas", },
                                        { title: "2 - Chantagem", rowId: "Chantagem", },
                                        { title: "3 - Mentir - Enganar", rowId: "Mentir - Enganar", },
                                        { title: "4 - Culpar", rowId: "Culpar", },
                                        { title: "5 - Desqualificar", rowId: "Desqualificar", },
                                        { title: "6 - Ridicularizar - Ofender", rowId: "Ridicularizar - Ofender", },
                                        { title: "7 - Humilhar em publico", rowId: "Humilhar em publico", },
                                        { title: "8 - Controlar - proibir", rowId: "Controlar - proibir", }
                                    ]
                                },
                                {
                                    title: "Reaja! 😰.",
                                    rows: [
                                        { title: "9 - Intimidar - ameaçar", rowId: "Intimidar - ameaçar", },
                                        { title: "10 - Expor a vida intima", rowId: "Expor a vida intima", },
                                        { title: "11 - Destruir bens pessoais", rowId: "Destruir bens pessoais", },
                                        { title: "12 - Machucar - Sacudir", rowId: "Machucar - Sacudir", },
                                        { title: "13 - Brincar de bater", rowId: "Brincar de bater", },
                                        { title: "14 - Empurrar", rowId: "Empurrar", },
                                        { title: "15 - Xingar", rowId: "Xingar", },
                                        { title: "16 - Diminuir a autoestima", rowId: "Diminuir a autoestima", },
                                        { title: "17 - Impedir de prevenir a gravidez", rowId: "Impedir de prevenir a gravidez", },
                                    ]
                                },
                                {
                                    title: "Procure ajuda! 😱🧐😡.",
                                    rows: [
                                        { title: "18 - Dar tapas", rowId: "Dar tapas", },
                                        { title: "19 - Chutar", rowId: "Chutar", },
                                        { title: "20 - Confinar - Prender", rowId: "Confinar - Prender", },
                                        { title: "21 - Ameaçar com objetos ou armas", rowId: "Ameaçar com objetos ou armas", },
                                        { title: "22 - Forçar relação sexual", rowId: "Forçar relação sexual", },
                                        { title: "23 - Obrigar a abortar", rowId: "Obrigar a abortar", },
                                        { title: "24 - Causar lesão corporal grave - Mutilar", rowId: "Causar lesão corporal grave - Mutilar", },
                                        { title: "25 - Ameaçar de morte", rowId: "Ameaçar de morte", },
                                        { title: "26 - MATAR", rowId: "MATAR", },
                                    ]
                                },
                            ]

                            const listMessage = {
                                text: "*Em que nível você está?*",
                                footer: "Tome uma atitude antes que seja tarde demais, fique atenta! a violência tende a aumentar.",
                                title: "DIARÔMETRO: O termômetro do seu relacionamento.",
                                buttonText: "Escolha aqui!",
                                sections
                            }
                            await SendMessage(
                                jid,
                                {
                                    image: fs.readFileSync("img/dairometro.jpeg"),
                                    caption: "",
                                    gifPlayback: false
                                }
                            )
                            await SendMessage(jid, {
                                text:
                                    '*Em que nível você está?*' + '\n\n' +
                                    "Tome uma atitude antes que seja tarde demais, fique atenta! a violência tende a aumentar." + '\n' +
                                    "DIARÔMETRO: O termômetro do seu relacionamento."
                            })
                            await SendMessage(jid, {
                                text:
                                    '1 - Piadas ofensivas' + '\n' +
                                    '2 - Chantagem' + '\n' +
                                    '3 - Mentir - Enganar' + '\n' +
                                    "4 - Culpar" + '\n' +
                                    "5 - Desqualificar" + '\n' +
                                    "6 - Ridicularizar - Ofender" + '\n' +
                                    "7 - Humilhar em publico" + '\n' +
                                    "8 - Controlar - proibir" + '\n' +
                                    "9 - Intimidar - ameaçar" + '\n' +
                                    "10 - Expor a vida intima" + '\n' +
                                    "11 - Destruir bens pessoais" + '\n' +
                                    "12 - Machucar - Sacudir" + '\n' +
                                    "13 - Brincar de bater" + '\n' +
                                    "14 - Empurrar" + '\n' +
                                    "15 - Xingar" + '\n' +
                                    "16 - Diminuir a autoestima" + '\n' +
                                    "17 - Impedir de prevenir a gravidez" + '\n' +
                                    "18 - Dar tapas" + '\n' +
                                    "19 - Chutar" + '\n' +
                                    "20 - Confinar - Prender" + '\n' +
                                    "21 - Ameaçar com objetos ou armas" + '\n' +
                                    "22 - Forçar relação sexual" + '\n' +
                                    "23 - Obrigar a abortar" + '\n' +
                                    "24 - Causar lesão corporal grave - Mutilar" + '\n' +
                                    "25 - Ameaçar de morte" + '\n' +
                                    "26 - MATAR"
                            })
                            break
                        case 'eu mulher ja cadastrado':
                            await SendMessage(jid, {
                                text:
                                    `👩🏻‍💼 Que bom ${userInfo.apelido}, ter você aqui mais vez e contar com sua participação ativa e importante para nossa causa !` + '\n\n' +
                                    '1 - Canais de denuncia 🆘' + '\n' +
                                    // '2 - Diarômetro 🌡️' + '\n' +
                                    '2 - Anjo da Guarda 👼'

                            });
                            break
                        case 'mandar lista de numeros de emergencia':
                            const vcard = 'BEGIN:VCARD\n'
                                + 'VERSION:3.0\n'
                                + 'FN:Ouvidoria da Mulher\n'
                                + 'ORG:Ouvidoria da Mulher;\n'
                                + 'TEL;type=CELL;type=VOICE;waid=5561996565008:+55 61 99656 5008\n'
                                + 'END:VCARD'



                            await SendMessage(jid, { contacts: { displayName: 'Ouvidoria da Mulher', contacts: [{ vcard }] } })
                            await SendMessage(jid, {
                                text:
                                    'Em caso de emergência de uma grave ameaça, acione as forças de segurança: polícia 📞📲 190 🚔🆘' + '\n\n' +
                                    'Para continuar, digite qualquer coisa que retornará ao menu inicial'
                            })

                            break
                        case 'não quis enviar dp do papel de parede':
                            const buttons24 = [
                                { buttonId: 'Menu inicial', buttonText: { displayText: 'Menu inicial' }, type: 1 },

                            ];

                            const buttonMessage24 = {
                                text: `Voltar para o menu`,
                                footer: 'Para continuar, aperte o botão abaixo!',
                                buttons: buttons24,
                                headerType: 1
                            }
                            await SendMessage(jid, buttonMessage24)
                            break
                        case 'perguntar de ela deseja descrever Piadas ofensivas':
                            const buttons9 = [
                                { buttonId: 'SimEnviarDpDiarometro', buttonText: { displayText: 'Sim' }, type: 1 },
                                { buttonId: 'NaoEnviarDpDiarometro', buttonText: { displayText: 'Não' }, type: 1 },

                            ];
                            const buttonMessage9 = {
                                text: `*Piadas ofensivas.*\n\nQue bom ${userInfo.apelido}, por você estar atenta e reconhecer que (piadas onfensivas) é o primeiro (01) passo para tentar mudar o rumo da história da sua vida.\n\n*Deseja descrever a ação como ocorreu?*`,
                                footer: 'Escolha uma das opções abaixo!',
                                buttons: buttons9,
                                headerType: 1
                            }
                            await SendMessage(jid, {
                                text:
                                    `*Piadas ofensivas.*\n\nQue bom ${userInfo.apelido}, por você estar atenta e reconhecer que (piadas onfensivas) é o primeiro (01) passo para tentar mudar o rumo da história da sua vida.\n\n*Deseja descrever a ação como ocorreu?*` + '\n\n' +
                                    '*👉🏽 Sim*' + '\n' +
                                    '*👉🏽 Não*'
                            });
                            break
                        case 'escolheu enviar uma denuncia diarometro':
                            await SendMessage(jid, { text: 'Descreva seu depoimento.\nAtenção: ⚠️🆘\nNão esqueça de procurar ajuda a pessoas  próximas e denunciar, juntar  provas, fotos, vídeos e testemunhos presenciais.\nLeve o caso as autoridades e registre o BO! (Boletim de ocorrência).' })
                            break
                        case 'pergunta se quer enviar o depoimento diarometro':
                            const buttons10 = [
                                { buttonId: 'EnviarDpDiarometro', buttonText: { displayText: 'Sim' }, type: 1 },
                                { buttonId: 'NEnviarDpDiarometro', buttonText: { displayText: 'Não' }, type: 1 },

                            ];
                            const buttonMessage10 = {
                                text: `Você deseja anotar o texto acima?`,
                                footer: 'Escolha uma das opções abaixo!',
                                buttons: buttons10,
                                headerType: 1
                            }
                            await SendMessage(jid, {
                                text: 'Você deseja anotar o texto acima?' + '\n\n' +
                                    '*👉🏽 Sim*' + '\n' +
                                    '*👉🏽 Não*'
                            });
                            break
                        case 'dp diarometro enviado com sucesso':
                            const buttons26 = [
                                { buttonId: 'Diarômetro', buttonText: { displayText: 'Voltar para o Diarômetro' }, type: 1 },
                                { buttonId: 'Menu inicial', buttonText: { displayText: 'Menu inicial' }, type: 1 },

                            ];

                            const buttonMessage26 = {
                                text: `Depoimento anotado com sucesso!`,
                                footer: 'Escolha uma das opções abaixo!',
                                buttons: buttons26,
                                headerType: 1
                            }
                            await SendMessage(jid, {
                                text:
                                    'Depoimento anotado com sucesso!' + '\n\n' +
                                    '1 - Voltar para o Diarômetro' + '\n' +
                                    '2 - Menu inicial'
                            })
                            break
                        case 'escolheu nao enviar denuncia diarometro':
                            const buttons37 = [
                                { buttonId: 'Diarômetro', buttonText: { displayText: 'Voltar para o Diarômetro' }, type: 1 },
                                { buttonId: 'Menu inicial', buttonText: { displayText: 'Menu inicial' }, type: 1 },

                            ];

                            const buttonMessage37 = {
                                text: `O texto não foi anotado, o que deseja fazer agora.`,
                                footer: 'Escolha uma das opções abaixo!',
                                buttons: buttons37,
                                headerType: 1
                            }
                            await SendMessage(jid, {
                                text:
                                    'O texto não foi anotado, o que deseja fazer agora.' + '\n\n' +
                                    '1 - Voltar para o Diarômetro' + '\n' +
                                    '2 - Menu inicial'
                            })
                            break
                        case 'escolheu não enviar uma denuncia diarometro':
                            const buttons25 = [
                                { buttonId: 'Diarômetro', buttonText: { displayText: 'Voltar para o Diarômetro' }, type: 1 },
                                { buttonId: 'Menu inicial', buttonText: { displayText: 'Menu inicial' }, type: 1 },

                            ];

                            const buttonMessage25 = {
                                text: `Qual opção deseja escolher?`,
                                footer: 'Para continuar, aperte o botão abaixo!',
                                buttons: buttons25,
                                headerType: 1
                            }
                            await SendMessage(jid, buttonMessage25)
                            break
                        case 'perguntar de ela deseja descrever Chantagem':
                            const buttons11 = [
                                { buttonId: 'SimEnviarDpDiarometro', buttonText: { displayText: 'Sim' }, type: 1 },
                                { buttonId: 'NaoEnviarDpDiarometro', buttonText: { displayText: 'Não' }, type: 1 },

                            ];

                            await SendMessage(jid, {
                                text: `Muito bem ${userInfo.apelido}!\nPor você estar atenta e reconhecer que (${userInfo.titulo_do_dp}) é o ( 2° ) passo para tentar mudar o rumo da história da sua vida, e não deixar chegar às últimas consequências.(feminicidio) Você já é vítima de violência física e de uma grave ameaça! Se não procurou as autoridades ou registrou o BO, (Boletim de ocorrência)ou solicitou uma ME(Medida Protetiva) faça isso o mais rápido possível.\nÉ sua integridade física ou sua própria vida que está em jogo! Aínda há  tempo de reverter esse quadro!\n\n*Deseja descrever a ação como ocorreu?*` + '\n\n' +
                                    '*👉🏽 Sim*' + '\n' +
                                    '*👉🏽 Não*'
                            });
                            break
                        case 'perguntar de ela deseja descrever Mentir - Enganar':
                            const buttons12 = [
                                { buttonId: 'SimEnviarDpDiarometro', buttonText: { displayText: 'Sim' }, type: 1 },
                                { buttonId: 'NaoEnviarDpDiarometro', buttonText: { displayText: 'Não' }, type: 1 },

                            ];
                            const buttonMessage12 = {
                                text: `Muito bem ${userInfo.apelido}!\nPor você estar atenta e reconhecer que (${userInfo.titulo_do_dp}) é o ( 3° ) passo para tentar mudar o rumo da história da sua vida, e não deixar chegar às últimas consequências. (feminicidio) Você já é vítima de violência física e de uma grave ameaça! Se não procurou as autoridades ou registrou o BO, (Boletim de ocorrência) ou solicitou uma ME (Medida Protetiva) faça isso o mais rápido possível.\nÉ sua integridade física ou sua própria vida que está em jogo! Aínda há tempo de reverter esse quadro!`,
                                footer: 'Escolha uma das opções abaixo!',
                                buttons: buttons12,
                                headerType: 1
                            }
                            await SendMessage(jid,
                                {
                                    text: `Muito bem ${userInfo.apelido}!\nPor você estar atenta e reconhecer que (${userInfo.titulo_do_dp}) é o ( 3° ) passo para tentar mudar o rumo da história da sua vida, e não deixar chegar às últimas consequências.(feminicidio) Você já é vítima de violência física e de uma grave ameaça! Se não procurou as autoridades ou registrou o BO, (Boletim de ocorrência)ou solicitou uma ME(Medida Protetiva) faça isso o mais rápido possível.\nÉ sua integridade física ou sua própria vida que está em jogo! Aínda há  tempo de reverter esse quadro!\n\n*Deseja descrever a ação como ocorreu?*` + '\n\n' +
                                        '*👉🏽 Sim*' + '\n' +
                                        '*👉🏽 Não*'
                                }
                            );
                            break
                        case 'perguntar de ela deseja descrever Culpar':
                            const buttons13 = [
                                { buttonId: 'SimEnviarDpDiarometro', buttonText: { displayText: 'Sim' }, type: 1 },
                                { buttonId: 'NaoEnviarDpDiarometro', buttonText: { displayText: 'Não' }, type: 1 },

                            ];
                            const buttonMessage13 = {
                                text: `Muito bem ${userInfo.apelido}!\nPor você estar atenta e reconhecer que (${userInfo.titulo_do_dp}) é o ( 4° ) passo para tentar mudar o rumo da história da sua vida, e não deixar chegar às últimas consequências. (feminicidio) Você já é vítima de violência física e de uma grave ameaça! Se não procurou as autoridades ou registrou o BO, (Boletim de ocorrência) ou solicitou uma ME (Medida Protetiva) faça isso o mais rápido possível.\nÉ sua integridade física ou sua própria vida que está em jogo! Aínda há tempo de reverter esse quadro!`,
                                footer: 'Escolha uma das opções abaixo!',
                                buttons: buttons13,
                                headerType: 1
                            }
                            await SendMessage(jid, {
                                text: `Muito bem ${userInfo.apelido}!\nPor você estar atenta e reconhecer que (${userInfo.titulo_do_dp}) é o ( 4° ) passo para tentar mudar o rumo da história da sua vida, e não deixar chegar às últimas consequências.(feminicidio) Você já é vítima de violência física e de uma grave ameaça! Se não procurou as autoridades ou registrou o BO, (Boletim de ocorrência)ou solicitou uma ME(Medida Protetiva) faça isso o mais rápido possível.\nÉ sua integridade física ou sua própria vida que está em jogo! Aínda há  tempo de reverter esse quadro!\n\n*Deseja descrever a ação como ocorreu?*` + '\n\n' +
                                    '*👉🏽 Sim*' + '\n' +
                                    '*👉🏽 Não*'
                            });
                            break
                        case 'perguntar de ela deseja descrever Desqualificar':
                            const buttons14 = [
                                { buttonId: 'SimEnviarDpDiarometro', buttonText: { displayText: 'Sim' }, type: 1 },
                                { buttonId: 'NaoEnviarDpDiarometro', buttonText: { displayText: 'Não' }, type: 1 },

                            ];
                            const buttonMessage14 = {
                                text: `Muito bem ${userInfo.apelido}!\nPor você estar atenta e reconhecer que (${userInfo.titulo_do_dp}) é o ( 5° ) passo para tentar mudar o rumo da história da sua vida, e não deixar chegar às últimas consequências. (feminicidio) Você já é vítima de violência física e de uma grave ameaça! Se não procurou as autoridades ou registrou o BO, (Boletim de ocorrência) ou solicitou uma ME (Medida Protetiva) faça isso o mais rápido possível.\nÉ sua integridade física ou sua própria vida que está em jogo! Aínda há tempo de reverter esse quadro!`,
                                footer: 'Escolha uma das opções abaixo!',
                                buttons: buttons14,
                                headerType: 1
                            }
                            await SendMessage(jid, {
                                text: `Muito bem ${userInfo.apelido}!\nPor você estar atenta e reconhecer que (${userInfo.titulo_do_dp}) é o ( 5° ) passo para tentar mudar o rumo da história da sua vida, e não deixar chegar às últimas consequências.(feminicidio) Você já é vítima de violência física e de uma grave ameaça! Se não procurou as autoridades ou registrou o BO, (Boletim de ocorrência)ou solicitou uma ME(Medida Protetiva) faça isso o mais rápido possível.\nÉ sua integridade física ou sua própria vida que está em jogo! Aínda há  tempo de reverter esse quadro!\n\n*Deseja descrever a ação como ocorreu?*` + '\n\n' +
                                    '*👉🏽 Sim*' + '\n' +
                                    '*👉🏽 Não*'
                            });
                            break
                        case 'perguntar de ela deseja descrever Ridicularizar - Ofender':
                            const buttons15 = [
                                { buttonId: 'SimEnviarDpDiarometro', buttonText: { displayText: 'Sim' }, type: 1 },
                                { buttonId: 'NaoEnviarDpDiarometro', buttonText: { displayText: 'Não' }, type: 1 },

                            ];
                            const buttonMessage15 = {
                                text: `Muito bem ${userInfo.apelido}!\nPor você estar atenta e reconhecer que (${userInfo.titulo_do_dp}) é o ( ${userInfo.nivel_do_dp} ) passo para tentar mudar o rumo da história da sua vida, e não deixar chegar às últimas consequências. (feminicidio) Você já é vítima de violência física e de uma grave ameaça! Se não procurou as autoridades ou registrou o BO, (Boletim de ocorrência) ou solicitou uma ME (Medida Protetiva) faça isso o mais rápido possível.\nÉ sua integridade física ou sua própria vida que está em jogo! Aínda há tempo de reverter esse quadro!`,
                                footer: 'Escolha uma das opções abaixo!',
                                buttons: buttons15,
                                headerType: 1
                            }
                            await SendMessage(jid, {
                                text: `Muito bem ${userInfo.apelido}!\nPor você estar atenta e reconhecer que (${userInfo.titulo_do_dp}) é o ( 6° ) passo para tentar mudar o rumo da história da sua vida, e não deixar chegar às últimas consequências.(feminicidio) Você já é vítima de violência física e de uma grave ameaça! Se não procurou as autoridades ou registrou o BO, (Boletim de ocorrência)ou solicitou uma ME(Medida Protetiva) faça isso o mais rápido possível.\nÉ sua integridade física ou sua própria vida que está em jogo! Aínda há  tempo de reverter esse quadro!\n\n*Deseja descrever a ação como ocorreu?*` + '\n\n' +
                                    '*👉🏽 Sim*' + '\n' +
                                    '*👉🏽 Não*'
                            });
                            break
                        case 'perguntar de ela deseja descrever Humilhar em publico':
                            const buttons38 = [
                                { buttonId: 'SimEnviarDpDiarometro', buttonText: { displayText: 'Sim' }, type: 1 },
                                { buttonId: 'NaoEnviarDpDiarometro', buttonText: { displayText: 'Não' }, type: 1 },

                            ];
                            const buttonMessage38 = {
                                text: ``,
                                footer: 'Escolha uma das opções abaixo!',
                                buttons: buttons38,
                                headerType: 1
                            }
                            await SendMessage(jid, {
                                text: `*Humilhar em publico.*\n\nQue bom ${userInfo.apelido}, por você estar atenta e reconhecer que (Humilhar em publico) é o setimo (${userInfo.nivel_do_dp}) passo para tentar mudar o rumo da história da sua vida.\n\n*Deseja descrever a ação como ocorreu?*` + '\n\n' +
                                    '*👉🏽 Sim*' + '\n' +
                                    '*👉🏽 Não*'

                            });
                            break
                        case 'perguntar de ela deseja descrever Controlar - proibir':
                            try {
                                const buttons39 = [
                                    { buttonId: 'SimEnviarDpDiarometro', buttonText: { displayText: 'Sim' }, type: 1 },
                                    { buttonId: 'NaoEnviarDpDiarometro', buttonText: { displayText: 'Não' }, type: 1 },

                                ];

                                await SendMessage(jid, {
                                    text: `Muito bem ${userInfo.apelido}!\nPor você estar atenta e reconhecer que (${userInfo.titulo_do_dp}) é o ( ${userInfo.nivel_do_dp} ) passo para tentar mudar o rumo da história da sua vida, e não deixar chegar às últimas consequências. (feminicidio) Você já é vítima de violência física e de uma grave ameaça! Se não procurou as autoridades ou registrou o BO, (Boletim de ocorrência) ou solicitou uma ME (Medida Protetiva) faça isso o mais rápido possível.\nÉ sua integridade física ou sua própria vida que está em jogo! Aínda há tempo de reverter esse quadro!` + '\n\n' +
                                        '*👉🏽 Sim*' + '\n' +
                                        '*👉🏽 Não*'
                                });
                            } catch (error) {

                            }
                            break
                        case 'perguntar de ela deseja descrever Intimidar - ameaçar':
                            try {
                                const buttons39 = [
                                    { buttonId: 'SimEnviarDpDiarometro', buttonText: { displayText: 'Sim' }, type: 1 },
                                    { buttonId: 'NaoEnviarDpDiarometro', buttonText: { displayText: 'Não' }, type: 1 },

                                ];
                                const buttonMessage39 = {
                                    text: `Muito bem ${userInfo.apelido}!\nPor você estar atenta e reconhecer que (${userInfo.titulo_do_dp}) é o ( ${userInfo.nivel_do_dp} ) passo para tentar mudar o rumo da história da sua vida, e não deixar chegar às últimas consequências. (feminicidio) Você já é vítima de violência física e de uma grave ameaça! Se não procurou as autoridades ou registrou o BO, (Boletim de ocorrência) ou solicitou uma ME (Medida Protetiva) faça isso o mais rápido possível.\nÉ sua integridade física ou sua própria vida que está em jogo! Aínda há tempo de reverter esse quadro!`,
                                    footer: 'Escolha uma das opções abaixo!',
                                    buttons: buttons39,
                                    headerType: 1
                                }
                                await SendMessage(jid, {
                                    text: `Muito bem ${userInfo.apelido}!\nPor você estar atenta e reconhecer que (${userInfo.titulo_do_dp}) é o ( ${userInfo.nivel_do_dp} ) passo para tentar mudar o rumo da história da sua vida, e não deixar chegar às últimas consequências. (feminicidio) Você já é vítima de violência física e de uma grave ameaça! Se não procurou as autoridades ou registrou o BO, (Boletim de ocorrência) ou solicitou uma ME (Medida Protetiva) faça isso o mais rápido possível.\nÉ sua integridade física ou sua própria vida que está em jogo! Aínda há tempo de reverter esse quadro!\n*Deseja descrever a ação como ocorreu?*` + '\n\n' +
                                        '*👉🏽 Sim*' + '\n' +
                                        '*👉🏽 Não*',

                                });
                            } catch (error) {

                            }
                            break
                        case 'perguntar de ela deseja descrever Expor a vida intima':
                            try {
                                const buttons39 = [
                                    { buttonId: 'SimEnviarDpDiarometro', buttonText: { displayText: 'Sim' }, type: 1 },
                                    { buttonId: 'NaoEnviarDpDiarometro', buttonText: { displayText: 'Não' }, type: 1 },

                                ];
                                const buttonMessage39 = {
                                    text: `Muito bem ${userInfo.apelido}!\nPor você estar atenta e reconhecer que (${userInfo.titulo_do_dp}) é o ( ${userInfo.nivel_do_dp} ) passo para tentar mudar o rumo da história da sua vida, e não deixar chegar às últimas consequências. (feminicidio) Você já é vítima de violência física e de uma grave ameaça! Se não procurou as autoridades ou registrou o BO, (Boletim de ocorrência) ou solicitou uma ME (Medida Protetiva) faça isso o mais rápido possível.\nÉ sua integridade física ou sua própria vida que está em jogo! Aínda há tempo de reverter esse quadro!`,
                                    footer: 'Escolha uma das opções abaixo!',
                                    buttons: buttons39,
                                    headerType: 1
                                }
                                await SendMessage(jid, {
                                    text: `Muito bem ${userInfo.apelido}!\nPor você estar atenta e reconhecer que (${userInfo.titulo_do_dp}) é o ( ${userInfo.nivel_do_dp} ) passo para tentar mudar o rumo da história da sua vida, e não deixar chegar às últimas consequências. (feminicidio) Você já é vítima de violência física e de uma grave ameaça! Se não procurou as autoridades ou registrou o BO, (Boletim de ocorrência) ou solicitou uma ME (Medida Protetiva) faça isso o mais rápido possível.\nÉ sua integridade física ou sua própria vida que está em jogo! Aínda há tempo de reverter esse quadro!\n*Deseja descrever a ação como ocorreu?*` + '\n\n' +
                                        '*👉🏽 Sim*' + '\n' +
                                        '*👉🏽 Não*',

                                });
                            } catch (error) {

                            }
                            break
                        case 'perguntar de ela deseja descrever Destruir bens pessoais':
                            try {
                                const buttons39 = [
                                    { buttonId: 'SimEnviarDpDiarometro', buttonText: { displayText: 'Sim' }, type: 1 },
                                    { buttonId: 'NaoEnviarDpDiarometro', buttonText: { displayText: 'Não' }, type: 1 },

                                ];
                                const buttonMessage39 = {
                                    text: `Muito bem ${userInfo.apelido}!\nPor você estar atenta e reconhecer que (${userInfo.titulo_do_dp}) é o ( ${userInfo.nivel_do_dp} ) passo para tentar mudar o rumo da história da sua vida, e não deixar chegar às últimas consequências. (feminicidio) Você já é vítima de violência física e de uma grave ameaça! Se não procurou as autoridades ou registrou o BO, (Boletim de ocorrência) ou solicitou uma ME (Medida Protetiva) faça isso o mais rápido possível.\nÉ sua integridade física ou sua própria vida que está em jogo! Aínda há tempo de reverter esse quadro!`,
                                    footer: 'Escolha uma das opções abaixo!',
                                    buttons: buttons39,
                                    headerType: 1
                                }
                                await SendMessage(jid, {
                                    text: `Muito bem ${userInfo.apelido}!\nPor você estar atenta e reconhecer que (${userInfo.titulo_do_dp}) é o ( ${userInfo.nivel_do_dp} ) passo para tentar mudar o rumo da história da sua vida, e não deixar chegar às últimas consequências. (feminicidio) Você já é vítima de violência física e de uma grave ameaça! Se não procurou as autoridades ou registrou o BO, (Boletim de ocorrência) ou solicitou uma ME (Medida Protetiva) faça isso o mais rápido possível.\nÉ sua integridade física ou sua própria vida que está em jogo! Aínda há tempo de reverter esse quadro!\n*Deseja descrever a ação como ocorreu?*` + '\n\n' +
                                        '*👉🏽 Sim*' + '\n' +
                                        '*👉🏽 Não*',

                                });
                            } catch (error) {

                            }
                            break
                        case 'perguntar de ela deseja descrever Machucar - Sacudir':
                            try {
                                const buttons39 = [
                                    { buttonId: 'SimEnviarDpDiarometro', buttonText: { displayText: 'Sim' }, type: 1 },
                                    { buttonId: 'NaoEnviarDpDiarometro', buttonText: { displayText: 'Não' }, type: 1 },

                                ];
                                const buttonMessage39 = {
                                    text: `Muito bem ${userInfo.apelido}!\nPor você estar atenta e reconhecer que (${userInfo.titulo_do_dp}) é o ( ${userInfo.nivel_do_dp} ) passo para tentar mudar o rumo da história da sua vida, e não deixar chegar às últimas consequências. (feminicidio) Você já é vítima de violência física e de uma grave ameaça! Se não procurou as autoridades ou registrou o BO, (Boletim de ocorrência) ou solicitou uma ME (Medida Protetiva) faça isso o mais rápido possível.\nÉ sua integridade física ou sua própria vida que está em jogo! Aínda há tempo de reverter esse quadro!`,
                                    footer: 'Escolha uma das opções abaixo!',
                                    buttons: buttons39,
                                    headerType: 1
                                }
                                await SendMessage(jid, {
                                    text: `Muito bem ${userInfo.apelido}!\nPor você estar atenta e reconhecer que (${userInfo.titulo_do_dp}) é o ( ${userInfo.nivel_do_dp} ) passo para tentar mudar o rumo da história da sua vida, e não deixar chegar às últimas consequências. (feminicidio) Você já é vítima de violência física e de uma grave ameaça! Se não procurou as autoridades ou registrou o BO, (Boletim de ocorrência) ou solicitou uma ME (Medida Protetiva) faça isso o mais rápido possível.\nÉ sua integridade física ou sua própria vida que está em jogo! Aínda há tempo de reverter esse quadro!\n*Deseja descrever a ação como ocorreu?*` + '\n\n' +
                                        '*👉🏽 Sim*' + '\n' +
                                        '*👉🏽 Não*',

                                });
                            } catch (error) {

                            }
                            break
                        case 'perguntar de ela deseja descrever Brincar de bater':
                            try {
                                const buttons39 = [
                                    { buttonId: 'SimEnviarDpDiarometro', buttonText: { displayText: 'Sim' }, type: 1 },
                                    { buttonId: 'NaoEnviarDpDiarometro', buttonText: { displayText: 'Não' }, type: 1 },

                                ];
                                const buttonMessage39 = {
                                    text: `Muito bem ${userInfo.apelido}!\nPor você estar atenta e reconhecer que (${userInfo.titulo_do_dp}) é o ( ${userInfo.nivel_do_dp} ) passo para tentar mudar o rumo da história da sua vida, e não deixar chegar às últimas consequências. (feminicidio) Você já é vítima de violência física e de uma grave ameaça! Se não procurou as autoridades ou registrou o BO, (Boletim de ocorrência) ou solicitou uma ME (Medida Protetiva) faça isso o mais rápido possível.\nÉ sua integridade física ou sua própria vida que está em jogo! Aínda há tempo de reverter esse quadro!`,
                                    footer: 'Escolha uma das opções abaixo!',
                                    buttons: buttons39,
                                    headerType: 1
                                }
                                await SendMessage(jid, {
                                    text: `Muito bem ${userInfo.apelido}!\nPor você estar atenta e reconhecer que (${userInfo.titulo_do_dp}) é o ( ${userInfo.nivel_do_dp} ) passo para tentar mudar o rumo da história da sua vida, e não deixar chegar às últimas consequências. (feminicidio) Você já é vítima de violência física e de uma grave ameaça! Se não procurou as autoridades ou registrou o BO, (Boletim de ocorrência) ou solicitou uma ME (Medida Protetiva) faça isso o mais rápido possível.\nÉ sua integridade física ou sua própria vida que está em jogo! Aínda há tempo de reverter esse quadro!\n*Deseja descrever a ação como ocorreu?*` + '\n\n' +
                                        '*👉🏽 Sim*' + '\n' +
                                        '*👉🏽 Não*',

                                });
                            } catch (error) {

                            }
                            break
                        case 'perguntar de ela deseja descrever Empurrar':
                            try {
                                const buttons39 = [
                                    { buttonId: 'SimEnviarDpDiarometro', buttonText: { displayText: 'Sim' }, type: 1 },
                                    { buttonId: 'NaoEnviarDpDiarometro', buttonText: { displayText: 'Não' }, type: 1 },

                                ];
                                const buttonMessage39 = {
                                    text: `Muito bem ${userInfo.apelido}!\nPor você estar atenta e reconhecer que (${userInfo.titulo_do_dp}) é o ( ${userInfo.nivel_do_dp} ) passo para tentar mudar o rumo da história da sua vida, e não deixar chegar às últimas consequências. (feminicidio) Você já é vítima de violência física e de uma grave ameaça! Se não procurou as autoridades ou registrou o BO, (Boletim de ocorrência) ou solicitou uma ME (Medida Protetiva) faça isso o mais rápido possível.\nÉ sua integridade física ou sua própria vida que está em jogo! Aínda há tempo de reverter esse quadro!`,
                                    footer: 'Escolha uma das opções abaixo!',
                                    buttons: buttons39,
                                    headerType: 1
                                }
                                await SendMessage(jid, {
                                    text: `Muito bem ${userInfo.apelido}!\nPor você estar atenta e reconhecer que (${userInfo.titulo_do_dp}) é o ( ${userInfo.nivel_do_dp} ) passo para tentar mudar o rumo da história da sua vida, e não deixar chegar às últimas consequências. (feminicidio) Você já é vítima de violência física e de uma grave ameaça! Se não procurou as autoridades ou registrou o BO, (Boletim de ocorrência) ou solicitou uma ME (Medida Protetiva) faça isso o mais rápido possível.\nÉ sua integridade física ou sua própria vida que está em jogo! Aínda há tempo de reverter esse quadro!\n*Deseja descrever a ação como ocorreu?*` + '\n\n' +
                                        '*👉🏽 Sim*' + '\n' +
                                        '*👉🏽 Não*',

                                });
                            } catch (error) {

                            }
                            break
                        case 'perguntar de ela deseja descrever Xingar':
                            try {
                                const buttons39 = [
                                    { buttonId: 'SimEnviarDpDiarometro', buttonText: { displayText: 'Sim' }, type: 1 },
                                    { buttonId: 'NaoEnviarDpDiarometro', buttonText: { displayText: 'Não' }, type: 1 },

                                ];
                                const buttonMessage39 = {
                                    text: `Muito bem ${userInfo.apelido}!\nPor você estar atenta e reconhecer que (${userInfo.titulo_do_dp}) é o ( ${userInfo.nivel_do_dp} ) passo para tentar mudar o rumo da história da sua vida, e não deixar chegar às últimas consequências. (feminicidio) Você já é vítima de violência física e de uma grave ameaça! Se não procurou as autoridades ou registrou o BO, (Boletim de ocorrência) ou solicitou uma ME (Medida Protetiva) faça isso o mais rápido possível.\nÉ sua integridade física ou sua própria vida que está em jogo! Aínda há tempo de reverter esse quadro!`,
                                    footer: 'Escolha uma das opções abaixo!',
                                    buttons: buttons39,
                                    headerType: 1
                                }
                                await SendMessage(jid, {
                                    text: `Muito bem ${userInfo.apelido}!\nPor você estar atenta e reconhecer que (${userInfo.titulo_do_dp}) é o ( ${userInfo.nivel_do_dp} ) passo para tentar mudar o rumo da história da sua vida, e não deixar chegar às últimas consequências. (feminicidio) Você já é vítima de violência física e de uma grave ameaça! Se não procurou as autoridades ou registrou o BO, (Boletim de ocorrência) ou solicitou uma ME (Medida Protetiva) faça isso o mais rápido possível.\nÉ sua integridade física ou sua própria vida que está em jogo! Aínda há tempo de reverter esse quadro!\n*Deseja descrever a ação como ocorreu?*` + '\n\n' +
                                        '*👉🏽 Sim*' + '\n' +
                                        '*👉🏽 Não*',

                                });
                            } catch (error) {

                            }
                            break
                        case 'perguntar de ela deseja descrever Diminuir a autoestima':
                            try {
                                const buttons39 = [
                                    { buttonId: 'SimEnviarDpDiarometro', buttonText: { displayText: 'Sim' }, type: 1 },
                                    { buttonId: 'NaoEnviarDpDiarometro', buttonText: { displayText: 'Não' }, type: 1 },

                                ];
                                const buttonMessage39 = {
                                    text: `Muito bem ${userInfo.apelido}!\nPor você estar atenta e reconhecer que (${userInfo.titulo_do_dp}) é o ( ${userInfo.nivel_do_dp} ) passo para tentar mudar o rumo da história da sua vida, e não deixar chegar às últimas consequências. (feminicidio) Você já é vítima de violência física e de uma grave ameaça! Se não procurou as autoridades ou registrou o BO, (Boletim de ocorrência) ou solicitou uma ME (Medida Protetiva) faça isso o mais rápido possível.\nÉ sua integridade física ou sua própria vida que está em jogo! Aínda há tempo de reverter esse quadro!`,
                                    footer: 'Escolha uma das opções abaixo!',
                                    buttons: buttons39,
                                    headerType: 1
                                }
                                await SendMessage(jid, {
                                    text: `Muito bem ${userInfo.apelido}!\nPor você estar atenta e reconhecer que (${userInfo.titulo_do_dp}) é o ( ${userInfo.nivel_do_dp} ) passo para tentar mudar o rumo da história da sua vida, e não deixar chegar às últimas consequências. (feminicidio) Você já é vítima de violência física e de uma grave ameaça! Se não procurou as autoridades ou registrou o BO, (Boletim de ocorrência) ou solicitou uma ME (Medida Protetiva) faça isso o mais rápido possível.\nÉ sua integridade física ou sua própria vida que está em jogo! Aínda há tempo de reverter esse quadro!\n*Deseja descrever a ação como ocorreu?*` + '\n\n' +
                                        '*👉🏽 Sim*' + '\n' +
                                        '*👉🏽 Não*',

                                });
                            } catch (error) {

                            }
                            break
                        case 'perguntar de ela deseja descrever Impedir de prevenir a gravidez':
                            try {
                                const buttons39 = [
                                    { buttonId: 'SimEnviarDpDiarometro', buttonText: { displayText: 'Sim' }, type: 1 },
                                    { buttonId: 'NaoEnviarDpDiarometro', buttonText: { displayText: 'Não' }, type: 1 },

                                ];
                                const buttonMessage39 = {
                                    text: `Muito bem ${userInfo.apelido}!\nPor você estar atenta e reconhecer que (${userInfo.titulo_do_dp}) é o ( ${userInfo.nivel_do_dp} ) passo para tentar mudar o rumo da história da sua vida, e não deixar chegar às últimas consequências. (feminicidio) Você já é vítima de violência física e de uma grave ameaça! Se não procurou as autoridades ou registrou o BO, (Boletim de ocorrência) ou solicitou uma ME (Medida Protetiva) faça isso o mais rápido possível.\nÉ sua integridade física ou sua própria vida que está em jogo! Aínda há tempo de reverter esse quadro!`,
                                    footer: 'Escolha uma das opções abaixo!',
                                    buttons: buttons39,
                                    headerType: 1
                                }
                                await SendMessage(jid, {
                                    text: `Muito bem ${userInfo.apelido}!\nPor você estar atenta e reconhecer que (${userInfo.titulo_do_dp}) é o ( ${userInfo.nivel_do_dp} ) passo para tentar mudar o rumo da história da sua vida, e não deixar chegar às últimas consequências. (feminicidio) Você já é vítima de violência física e de uma grave ameaça! Se não procurou as autoridades ou registrou o BO, (Boletim de ocorrência) ou solicitou uma ME (Medida Protetiva) faça isso o mais rápido possível.\nÉ sua integridade física ou sua própria vida que está em jogo! Aínda há tempo de reverter esse quadro!\n*Deseja descrever a ação como ocorreu?*` + '\n\n' +
                                        '*👉🏽 Sim*' + '\n' +
                                        '*👉🏽 Não*',

                                });
                            } catch (error) {

                            }
                            break
                        case 'perguntar de ela deseja descrever Dar tapas':
                            try {
                                const buttons39 = [
                                    { buttonId: 'SimEnviarDpDiarometro', buttonText: { displayText: 'Sim' }, type: 1 },
                                    { buttonId: 'NaoEnviarDpDiarometro', buttonText: { displayText: 'Não' }, type: 1 },

                                ];
                                const buttonMessage39 = {
                                    text: `Muito bem ${userInfo.apelido}!\nPor você estar atenta e reconhecer que (${userInfo.titulo_do_dp}) é o ( ${userInfo.nivel_do_dp} ) passo para tentar mudar o rumo da história da sua vida, e não deixar chegar às últimas consequências. (feminicidio) Você já é vítima de violência física e de uma grave ameaça! Se não procurou as autoridades ou registrou o BO, (Boletim de ocorrência) ou solicitou uma ME (Medida Protetiva) faça isso o mais rápido possível.\nÉ sua integridade física ou sua própria vida que está em jogo! Aínda há tempo de reverter esse quadro!`,
                                    footer: 'Escolha uma das opções abaixo!',
                                    buttons: buttons39,
                                    headerType: 1
                                }
                                await SendMessage(jid, {
                                    text: `Muito bem ${userInfo.apelido}!\nPor você estar atenta e reconhecer que (${userInfo.titulo_do_dp}) é o ( ${userInfo.nivel_do_dp} ) passo para tentar mudar o rumo da história da sua vida, e não deixar chegar às últimas consequências. (feminicidio) Você já é vítima de violência física e de uma grave ameaça! Se não procurou as autoridades ou registrou o BO, (Boletim de ocorrência) ou solicitou uma ME (Medida Protetiva) faça isso o mais rápido possível.\nÉ sua integridade física ou sua própria vida que está em jogo! Aínda há tempo de reverter esse quadro!\n*Deseja descrever a ação como ocorreu?*` + '\n\n' +
                                        '*👉🏽 Sim*' + '\n' +
                                        '*👉🏽 Não*',

                                });
                            } catch (error) {

                            }
                            break
                        case 'perguntar de ela deseja descrever Chutar':
                            try {
                                const buttons39 = [
                                    { buttonId: 'SimEnviarDpDiarometro', buttonText: { displayText: 'Sim' }, type: 1 },
                                    { buttonId: 'NaoEnviarDpDiarometro', buttonText: { displayText: 'Não' }, type: 1 },

                                ];
                                const buttonMessage39 = {
                                    text: `Muito bem ${userInfo.apelido}!\nPor você estar atenta e reconhecer que (${userInfo.titulo_do_dp}) é o ( ${userInfo.nivel_do_dp} ) passo para tentar mudar o rumo da história da sua vida, e não deixar chegar às últimas consequências. (feminicidio) Você já é vítima de violência física e de uma grave ameaça! Se não procurou as autoridades ou registrou o BO, (Boletim de ocorrência) ou solicitou uma ME (Medida Protetiva) faça isso o mais rápido possível.\nÉ sua integridade física ou sua própria vida que está em jogo! Aínda há tempo de reverter esse quadro!`,
                                    footer: 'Escolha uma das opções abaixo!',
                                    buttons: buttons39,
                                    headerType: 1
                                }
                                await SendMessage(jid, {
                                    text: `Muito bem ${userInfo.apelido}!\nPor você estar atenta e reconhecer que (${userInfo.titulo_do_dp}) é o ( ${userInfo.nivel_do_dp} ) passo para tentar mudar o rumo da história da sua vida, e não deixar chegar às últimas consequências. (feminicidio) Você já é vítima de violência física e de uma grave ameaça! Se não procurou as autoridades ou registrou o BO, (Boletim de ocorrência) ou solicitou uma ME (Medida Protetiva) faça isso o mais rápido possível.\nÉ sua integridade física ou sua própria vida que está em jogo! Aínda há tempo de reverter esse quadro!\n*Deseja descrever a ação como ocorreu?*` + '\n\n' +
                                        '*👉🏽 Sim*' + '\n' +
                                        '*👉🏽 Não*',

                                });
                            } catch (error) {

                            }
                            break
                        case 'perguntar de ela deseja descrever Confinar - Prender':
                            try {
                                const buttons39 = [
                                    { buttonId: 'SimEnviarDpDiarometro', buttonText: { displayText: 'Sim' }, type: 1 },
                                    { buttonId: 'NaoEnviarDpDiarometro', buttonText: { displayText: 'Não' }, type: 1 },

                                ];
                                const buttonMessage39 = {
                                    text: `Muito bem ${userInfo.apelido}!\nPor você estar atenta e reconhecer que (${userInfo.titulo_do_dp}) é o ( ${userInfo.nivel_do_dp} ) passo para tentar mudar o rumo da história da sua vida, e não deixar chegar às últimas consequências. (feminicidio) Você já é vítima de violência física e de uma grave ameaça! Se não procurou as autoridades ou registrou o BO, (Boletim de ocorrência) ou solicitou uma ME (Medida Protetiva) faça isso o mais rápido possível.\nÉ sua integridade física ou sua própria vida que está em jogo! Aínda há tempo de reverter esse quadro!`,
                                    footer: 'Escolha uma das opções abaixo!',
                                    buttons: buttons39,
                                    headerType: 1
                                }
                                await SendMessage(jid, {
                                    text: `Muito bem ${userInfo.apelido}!\nPor você estar atenta e reconhecer que (${userInfo.titulo_do_dp}) é o ( ${userInfo.nivel_do_dp} ) passo para tentar mudar o rumo da história da sua vida, e não deixar chegar às últimas consequências. (feminicidio) Você já é vítima de violência física e de uma grave ameaça! Se não procurou as autoridades ou registrou o BO, (Boletim de ocorrência) ou solicitou uma ME (Medida Protetiva) faça isso o mais rápido possível.\nÉ sua integridade física ou sua própria vida que está em jogo! Aínda há tempo de reverter esse quadro!\n*Deseja descrever a ação como ocorreu?*` + '\n\n' +
                                        '*👉🏽 Sim*' + '\n' +
                                        '*👉🏽 Não*',

                                });
                            } catch (error) {

                            }
                            break
                        case 'perguntar de ela deseja descrever Ameaçar com objetos ou armas':
                            try {
                                const buttons39 = [
                                    { buttonId: 'SimEnviarDpDiarometro', buttonText: { displayText: 'Sim' }, type: 1 },
                                    { buttonId: 'NaoEnviarDpDiarometro', buttonText: { displayText: 'Não' }, type: 1 },

                                ];
                                const buttonMessage39 = {
                                    text: `Muito bem ${userInfo.apelido}!\nPor você estar atenta e reconhecer que (${userInfo.titulo_do_dp}) é o ( ${userInfo.nivel_do_dp} ) passo para tentar mudar o rumo da história da sua vida, e não deixar chegar às últimas consequências. (feminicidio) Você já é vítima de violência física e de uma grave ameaça! Se não procurou as autoridades ou registrou o BO, (Boletim de ocorrência) ou solicitou uma ME (Medida Protetiva) faça isso o mais rápido possível.\nÉ sua integridade física ou sua própria vida que está em jogo! Aínda há tempo de reverter esse quadro!`,
                                    footer: 'Escolha uma das opções abaixo!',
                                    buttons: buttons39,
                                    headerType: 1
                                }
                                await SendMessage(jid, {
                                    text: `Muito bem ${userInfo.apelido}!\nPor você estar atenta e reconhecer que (${userInfo.titulo_do_dp}) é o ( ${userInfo.nivel_do_dp} ) passo para tentar mudar o rumo da história da sua vida, e não deixar chegar às últimas consequências. (feminicidio) Você já é vítima de violência física e de uma grave ameaça! Se não procurou as autoridades ou registrou o BO, (Boletim de ocorrência) ou solicitou uma ME (Medida Protetiva) faça isso o mais rápido possível.\nÉ sua integridade física ou sua própria vida que está em jogo! Aínda há tempo de reverter esse quadro!\n*Deseja descrever a ação como ocorreu?*` + '\n\n' +
                                        '*👉🏽 Sim*' + '\n' +
                                        '*👉🏽 Não*',

                                });
                            } catch (error) {

                            }
                            break
                        case 'perguntar de ela deseja descrever Forçar relação sexual':
                            try {
                                const buttons39 = [
                                    { buttonId: 'SimEnviarDpDiarometro', buttonText: { displayText: 'Sim' }, type: 1 },
                                    { buttonId: 'NaoEnviarDpDiarometro', buttonText: { displayText: 'Não' }, type: 1 },

                                ];
                                const buttonMessage39 = {
                                    text: `Muito bem ${userInfo.apelido}!\nPor você estar atenta e reconhecer que (${userInfo.titulo_do_dp}) é o ( ${userInfo.nivel_do_dp} ) passo para tentar mudar o rumo da história da sua vida, e não deixar chegar às últimas consequências. (feminicidio) Você já é vítima de violência física e de uma grave ameaça! Se não procurou as autoridades ou registrou o BO, (Boletim de ocorrência) ou solicitou uma ME (Medida Protetiva) faça isso o mais rápido possível.\nÉ sua integridade física ou sua própria vida que está em jogo! Aínda há tempo de reverter esse quadro!`,
                                    footer: 'Escolha uma das opções abaixo!',
                                    buttons: buttons39,
                                    headerType: 1
                                }
                                await SendMessage(jid, {
                                    text: `Muito bem ${userInfo.apelido}!\nPor você estar atenta e reconhecer que (${userInfo.titulo_do_dp}) é o ( ${userInfo.nivel_do_dp} ) passo para tentar mudar o rumo da história da sua vida, e não deixar chegar às últimas consequências. (feminicidio) Você já é vítima de violência física e de uma grave ameaça! Se não procurou as autoridades ou registrou o BO, (Boletim de ocorrência) ou solicitou uma ME (Medida Protetiva) faça isso o mais rápido possível.\nÉ sua integridade física ou sua própria vida que está em jogo! Aínda há tempo de reverter esse quadro!\n*Deseja descrever a ação como ocorreu?*` + '\n\n' +
                                        '*👉🏽 Sim*' + '\n' +
                                        '*👉🏽 Não*',

                                });
                            } catch (error) {

                            }
                            break
                        case 'perguntar de ela deseja descrever Obrigar a abortar':
                            try {
                                const buttons39 = [
                                    { buttonId: 'SimEnviarDpDiarometro', buttonText: { displayText: 'Sim' }, type: 1 },
                                    { buttonId: 'NaoEnviarDpDiarometro', buttonText: { displayText: 'Não' }, type: 1 },

                                ];
                                const buttonMessage39 = {
                                    text: `Muito bem ${userInfo.apelido}!\nPor você estar atenta e reconhecer que (${userInfo.titulo_do_dp}) é o ( ${userInfo.nivel_do_dp} ) passo para tentar mudar o rumo da história da sua vida, e não deixar chegar às últimas consequências. (feminicidio) Você já é vítima de violência física e de uma grave ameaça! Se não procurou as autoridades ou registrou o BO, (Boletim de ocorrência) ou solicitou uma ME (Medida Protetiva) faça isso o mais rápido possível.\nÉ sua integridade física ou sua própria vida que está em jogo! Aínda há tempo de reverter esse quadro!`,
                                    footer: 'Escolha uma das opções abaixo!',
                                    buttons: buttons39,
                                    headerType: 1
                                }
                                await SendMessage(jid, {
                                    text: `Muito bem ${userInfo.apelido}!\nPor você estar atenta e reconhecer que (${userInfo.titulo_do_dp}) é o ( ${userInfo.nivel_do_dp} ) passo para tentar mudar o rumo da história da sua vida, e não deixar chegar às últimas consequências. (feminicidio) Você já é vítima de violência física e de uma grave ameaça! Se não procurou as autoridades ou registrou o BO, (Boletim de ocorrência) ou solicitou uma ME (Medida Protetiva) faça isso o mais rápido possível.\nÉ sua integridade física ou sua própria vida que está em jogo! Aínda há tempo de reverter esse quadro!\n*Deseja descrever a ação como ocorreu?*` + '\n\n' +
                                        '*👉🏽 Sim*' + '\n' +
                                        '*👉🏽 Não*',

                                });
                            } catch (error) {

                            }
                            break
                        case 'perguntar de ela deseja descrever Causar lesão corporal grave - Mutilar':
                            try {
                                const buttons39 = [
                                    { buttonId: 'SimEnviarDpDiarometro', buttonText: { displayText: 'Sim' }, type: 1 },
                                    { buttonId: 'NaoEnviarDpDiarometro', buttonText: { displayText: 'Não' }, type: 1 },

                                ];
                                const buttonMessage39 = {
                                    text: `Muito bem ${userInfo.apelido}!\nPor você estar atenta e reconhecer que (${userInfo.titulo_do_dp}) é o ( ${userInfo.nivel_do_dp} ) passo para tentar mudar o rumo da história da sua vida, e não deixar chegar às últimas consequências. (feminicidio) Você já é vítima de violência física e de uma grave ameaça! Se não procurou as autoridades ou registrou o BO, (Boletim de ocorrência) ou solicitou uma ME (Medida Protetiva) faça isso o mais rápido possível.\nÉ sua integridade física ou sua própria vida que está em jogo! Aínda há tempo de reverter esse quadro!`,
                                    footer: 'Escolha uma das opções abaixo!',
                                    buttons: buttons39,
                                    headerType: 1
                                }
                                await SendMessage(jid, {
                                    text: `Muito bem ${userInfo.apelido}!\nPor você estar atenta e reconhecer que (${userInfo.titulo_do_dp}) é o ( ${userInfo.nivel_do_dp} ) passo para tentar mudar o rumo da história da sua vida, e não deixar chegar às últimas consequências. (feminicidio) Você já é vítima de violência física e de uma grave ameaça! Se não procurou as autoridades ou registrou o BO, (Boletim de ocorrência) ou solicitou uma ME (Medida Protetiva) faça isso o mais rápido possível.\nÉ sua integridade física ou sua própria vida que está em jogo! Aínda há tempo de reverter esse quadro!\n*Deseja descrever a ação como ocorreu?*` + '\n\n' +
                                        '*👉🏽 Sim*' + '\n' +
                                        '*👉🏽 Não*',

                                });
                            } catch (error) {

                            }
                            break
                        case 'perguntar de ela deseja descrever Ameaçar de morte':
                            try {
                                const buttons39 = [
                                    { buttonId: 'SimEnviarDpDiarometro', buttonText: { displayText: 'Sim' }, type: 1 },
                                    { buttonId: 'NaoEnviarDpDiarometro', buttonText: { displayText: 'Não' }, type: 1 },

                                ];
                                const buttonMessage39 = {
                                    text: `Muito bem ${userInfo.apelido}!\nPor você estar atenta e reconhecer que (${userInfo.titulo_do_dp}) é o ( ${userInfo.nivel_do_dp} ) passo para tentar mudar o rumo da história da sua vida, e não deixar chegar às últimas consequências. (feminicidio) Você já é vítima de violência física e de uma grave ameaça! Se não procurou as autoridades ou registrou o BO, (Boletim de ocorrência) ou solicitou uma ME (Medida Protetiva) faça isso o mais rápido possível.\nÉ sua integridade física ou sua própria vida que está em jogo! Aínda há tempo de reverter esse quadro!`,
                                    footer: 'Escolha uma das opções abaixo!',
                                    buttons: buttons39,
                                    headerType: 1
                                }
                                await SendMessage(jid, {
                                    text: `Muito bem ${userInfo.apelido}!\nPor você estar atenta e reconhecer que (${userInfo.titulo_do_dp}) é o ( ${userInfo.nivel_do_dp} ) passo para tentar mudar o rumo da história da sua vida, e não deixar chegar às últimas consequências. (feminicidio) Você já é vítima de violência física e de uma grave ameaça! Se não procurou as autoridades ou registrou o BO, (Boletim de ocorrência) ou solicitou uma ME (Medida Protetiva) faça isso o mais rápido possível.\nÉ sua integridade física ou sua própria vida que está em jogo! Aínda há tempo de reverter esse quadro!\n*Deseja descrever a ação como ocorreu?*` + '\n\n' +
                                        '*👉🏽 Sim*' + '\n' +
                                        '*👉🏽 Não*',

                                });
                            } catch (error) {

                            }
                            break
                        case 'perguntar de ela deseja descrever MATAR':
                            try {
                                const buttons39 = [
                                    { buttonId: 'SimEnviarDpDiarometro', buttonText: { displayText: 'Sim' }, type: 1 },
                                    { buttonId: 'NaoEnviarDpDiarometro', buttonText: { displayText: 'Não' }, type: 1 },

                                ];
                                const buttonMessage39 = {
                                    text: `Muito bem ${userInfo.apelido}!\nPor você estar atenta e reconhecer que (${userInfo.titulo_do_dp}) é o ( ${userInfo.nivel_do_dp} ) passo para tentar mudar o rumo da história da sua vida, e não deixar chegar às últimas consequências. (feminicidio) Você já é vítima de violência física e de uma grave ameaça! Se não procurou as autoridades ou registrou o BO, (Boletim de ocorrência) ou solicitou uma ME (Medida Protetiva) faça isso o mais rápido possível.\nÉ sua integridade física ou sua própria vida que está em jogo! Aínda há tempo de reverter esse quadro!`,
                                    footer: 'Escolha uma das opções abaixo!',
                                    buttons: buttons39,
                                    headerType: 1
                                }
                                await SendMessage(jid, {
                                    text: `Muito bem ${userInfo.apelido}!\nPor você estar atenta e reconhecer que (${userInfo.titulo_do_dp}) é o ( ${userInfo.nivel_do_dp} ) passo para tentar mudar o rumo da história da sua vida, e não deixar chegar às últimas consequências. (feminicidio) Você já é vítima de violência física e de uma grave ameaça! Se não procurou as autoridades ou registrou o BO, (Boletim de ocorrência) ou solicitou uma ME (Medida Protetiva) faça isso o mais rápido possível.\nÉ sua integridade física ou sua própria vida que está em jogo! Aínda há tempo de reverter esse quadro!\n*Deseja descrever a ação como ocorreu?*` + '\n\n' +
                                        '*👉🏽 Sim*' + '\n' +
                                        '*👉🏽 Não*',

                                });
                            } catch (error) {

                            }
                            break
                        case 'escolheu anjo da guarda vazio':
                            const buttons16 = [
                                { buttonId: 'simAddNumVazio', buttonText: { displayText: 'Sim' }, type: 1 },
                                { buttonId: 'naoAddNumVazio', buttonText: { displayText: 'Não' }, type: 1 },

                            ];

                            await SendMessage(jid, {
                                text:
                                    `${userInfo.apelido} a lista de contatos está vazia, deseja adicionar algum número?` + '\n\n' +
                                    '*👉🏽 Sim*' + '\n' +
                                    '*👉🏽 Não*'
                            });
                            break
                        case 'escolheu anjo da guarda':
                            let numsStr = userInfo.numeroAnjo.replace(/[^0-9]/g, '');
                            await SendMessage(jid, { text: `${numsStr}` })
                            break
                        case 'pedir para digitar um numero para add':
                            await SendMessage(jid, { text: 'Digite um número para ser adicionado.\n\nExemplo *5521978997994*' })
                            break
                        case 'confirmar o numero adcionado vazio':
                            const buttons18 = [
                                { buttonId: 'simConfirmaAddNumVazio', buttonText: { displayText: 'Sim' }, type: 1 },
                                { buttonId: 'naoConfirmaAddNumVazio', buttonText: { displayText: 'Não' }, type: 1 },

                            ];
                            const buttonMessage18 = {
                                text: `${userInfo.apelido} o número que deseja adicionar está correto?\n\n${userInfo.numeroAnjo}`,
                                footer: 'Escolha uma das opções abaixo!',
                                buttons: buttons18,
                                headerType: 1
                            }
                            await SendMessage(jid, {
                                text:
                                    `${userInfo.apelido} o número que deseja adicionar está correto?` + '\n\n' +
                                    `${userInfo.numeroAnjo}` + '\n\n' +
                                    '*👉🏽 Sim*' + '\n' +
                                    '*👉🏽 Não*'
                            });
                            break
                        case 'confirmou o numero que digitou':

                            const buttons19 = [
                                { buttonId: 'enviar notificacao', buttonText: { displayText: 'Sim' }, type: 1 },
                                { buttonId: 'voltar para menu', buttonText: { displayText: 'Não' }, type: 1 },
                                { buttonId: 'maisopções', buttonText: { displayText: 'Mais opções' }, type: 1 },


                            ];

                            await SendMessage(jid, {
                                text:
                                    `${userInfo.apelido} deseja enviar a notificação para os números abaixo?` + '\n\n' +
                                    `${userInfo.numerosAnjo.join('\n')}` + '\n\n' +
                                    '1 - Sim' + '\n' +
                                    '2 - Não' + '\n' +
                                    '3 - Mais Opções'
                            });
                            break
                        case 'pedir para digitar um numero para add mais':
                            await SendMessage(jid, { text: 'Digite um número para ser adicionado.' })
                            break
                        case 'confirmar o numero adicionado mais de um numero':
                            const buttons20 = [
                                { buttonId: 'simConfirmaAddMaisNumVazio', buttonText: { displayText: 'Sim' }, type: 1 },
                                { buttonId: 'naoConfirmaAddMaisNumVazio', buttonText: { displayText: 'Não' }, type: 1 },

                            ];
                            const buttonMessage20 = {
                                text: `${userInfo.apelido} o número que deseja adicionar está correto?\n\n- ${userInfo.numeroAnjo}`,
                                footer: 'Escolha uma das opções abaixo!',
                                buttons: buttons20,
                                headerType: 1
                            }
                            await SendMessage(jid, buttonMessage20);
                            break
                        case 'outras opções anjo guardião':
                            const buttons27 = [
                                { buttonId: 'naoConfirmaAddNumVazio', buttonText: { displayText: 'Adicionar mais números' }, type: 1 },
                                { buttonId: 'Limpar lista', buttonText: { displayText: 'Limpar Lista' }, type: 1 },
                                { buttonId: 'Menu inicial', buttonText: { displayText: 'Menu inicial' }, type: 1 },



                            ];
                            const buttonMessage27 = {
                                text: ``,
                                footer: 'Escolha uma das opções abaixo!',
                                buttons: buttons27,
                                headerType: 1
                            }
                            await SendMessage(jid, {
                                text:
                                    `${userInfo.apelido}, escolha uma das opções abaixo!` + '\n\n' +
                                    '1 - Adicionar mais números' + '\n' +
                                    '2 - Limpar Lista' + '\n' +
                                    '3 - Menu inicial'
                            });
                            break
                        case 'entrou no eu voluntario':
                            const buttons28 = [
                                { buttonId: 'Canais de denuncia 2', buttonText: { displayText: 'Canais de denúncia' }, type: 1 },
                                { buttonId: 'Eu apoio', buttonText: { displayText: 'Eu acolho' }, type: 1 },
                                { buttonId: 'Acolha-me', buttonText: { displayText: 'Acolha-me' }, type: 1 },
                            ];

                            const buttonMessage28 = {
                                text: `Que bom ter você aqui como voluntário.\n\n`,
                                footer: 'Escolha uma das opções abaixo!',
                                buttons: buttons28,
                                headerType: 1
                            }
                            await SendMessage(jid, {
                                text:
                                    'Que bom ter você aqui como voluntário.' + '\n' +
                                    'estou ciente que você é uma empresa ou pessoa que não se conforma com a violência contra a mulher e quer fazer a diferença' + '\n' +
                                    'denunciando, acolhendo ou sendo acolhida de forma ativa e socialmente participativa!' + '\n\n' +
                                    '1 - Canais de denúncia' + '\n' +
                                    '2 - Eu acolho' + '\n' +
                                    '3 - Acolha-me'
                            });
                            break
                        case 'entrou no Canais de denuncia 2':
                            const buttons29 = [
                                { buttonId: 'disque emergencia 2', buttonText: { displayText: 'Disque Emergência' }, type: 1 },
                                { buttonId: 'dununcia 2', buttonText: { displayText: 'Denúncia' }, type: 1 },
                                { buttonId: 'Direitos Humanos', buttonText: { displayText: 'Direitos Humanos' }, type: 1 },
                            ];

                            const buttonMessage29 = {
                                text: `Escolha uma das opções abaixo!`,
                                footer: 'Escolha uma das opções abaixo!',
                                buttons: buttons29,
                                headerType: 1
                            }
                            await SendMessage(jid, {
                                text:
                                    'Escolha uma das opções abaixo!' + '\n\n' +
                                    '1 - Disque Emergência' + '\n' +
                                    '2 - Denúncia' + '\n' +
                                    '3 - Direitos Humanos'
                            });
                            break
                        case 'entrou no disque emergencia 2':
                            const buttons30 = [
                                { buttonId: 'Menu inicial', buttonText: { displayText: 'Menu inicial' }, type: 1 },

                            ];


                            await SendMessage(jid, { text: '*Polícia Militar (190)*\n\nO trabalho da polícia é garantir a segurança da população, a ordem pública e o cumprimento das leis. Sempre que sofrer ou presenciar algum crime que represente riscos para as pessoas, como assaltos, roubos ou agressões.A PM pode ser acionada em casos de perturbação da ordem pública, uma festa com som alto, que incomode a vizinhança tarde da noite.\n\n*Samu (192)*\n\nNos casos de emergências médicas, o mais indicado é acionar o Serviço de Atendimento Médico de Urgência. O SAMU conta com ambulâncias equipadas e equipe médica qualificada para prestar os atendimentos de emergências o mais rápido possível. Basta ligar para o número 192 e relatar o ocorrido, que uma ambulância será encaminhada até o local.\n\n*Bombeiros (193)*\n\nGrande parte dos acidentes que representam riscos para as pessoas podem ser amenizadas com o socorro imediato do Corpo de Bombeiros. Situações como: resgate de pessoas ou animais; inundação e desabamento; incêndio; afogamento; acidente com animal peçonhento entre outros.\n\n*A Central de Atendimento à Mulher*\n\nLigue 180 é um serviço atualmente oferecido pela Ouvidoria Nacional dos Direitos Humanos do Ministério da Mulher, da Família e dos Direitos Humanos (MMFDH). É uma política pública essencial para o enfrentamento à violência contra a mulher em âmbito nacional e internacional.' })
                            break
                        case 'entrou no dununcia 2':
                            await SendMessage(jid, { text: 'Descreva seu depoimento.\nAtenção: ⚠️🆘\nNão esqueça de procurar ajuda a pessoas  próximas e denunciar, juntar  provas, fotos, vídeos e testemunhos presenciais.\nLeve o caso as autoridades e registre o BO! (Boletim de ocorrência).' })
                            break
                        case 'pergunta se quer enviar a denuncia':
                            const buttons31 = [
                                { buttonId: 'SimEnviardenuncia2', buttonText: { displayText: 'Sim' }, type: 1 },
                                { buttonId: 'NãoEnviardenuncia2', buttonText: { displayText: 'Não' }, type: 1 },

                            ];
                            const buttonMessage31 = {
                                text: `O texto acima está correto?`,
                                footer: 'Escolha uma das opções abaixo!',
                                buttons: buttons31,
                                headerType: 1
                            }
                            await SendMessage(jid, {
                                text:
                                    'O texto acima está correto?' + '\n\n' +
                                    '*👉🏽 Sim*' + '\n' +
                                    '*👉🏽 Não*'
                            });
                            break
                        case 'denuncia 2 enviada':

                            const buttons32 = [
                                { buttonId: 'Menu inicial', buttonText: { displayText: 'Menu inicial' }, type: 1 },

                            ];

                            const buttonMessage32 = {
                                text: `Dunúncia enviada com sucesso!`,
                                footer: 'Para continuar, aperte o botão abaixo!',
                                buttons: buttons32,
                                headerType: 1
                            }

                            await SendMessage(jid, {
                                text:
                                    'Dunúncia enviada com sucesso!' + '\n\n' +
                                    'Digite qualquer coisa para finalizar'
                            })
                            break
                        case 'denuncia 2 não enviada':
                            const buttons33 = [
                                { buttonId: 'Denunciar novamente 2', buttonText: { displayText: 'Denunciar novamente' }, type: 1 },
                                { buttonId: 'Menu inicial', buttonText: { displayText: 'Menu inicial' }, type: 1 },

                            ];

                            const buttonMessage33 = {
                                text: `Sua denuncia não foi enviada.`,
                                footer: 'Escolha uma das opções abaixo!',
                                buttons: buttons33,
                                headerType: 1
                            }

                            await SendMessage(jid, {
                                text:
                                    'Sua denuncia não foi enviada.' + '\n\n' +
                                    'Digite qualquer coisa para finalizar'
                            })
                            break
                        case 'entrou em eu apoio':
                            await SendMessage(jid, {
                                text:
                                    'Escolha uma das opções abaixo!.' + '\n\n' +
                                    '1 - Eu empresa' + '\n' +
                                    '2 - Eu embaixador'
                            })

                            break
                        case 'perguntar o nome da empresa':
                            await SendMessage(jid, { text: 'Digite o nome da sua Empresa.' })
                            break
                        case 'pergunta o endereço da empresa':
                            await SendMessage(jid, { text: 'Digite o endereço da sua Empresa.' })
                            break
                        case 'pergunta o cep da empresa':
                            await SendMessage(jid, { text: 'Digite o CEP da sua Empresa.' })
                            break
                        case 'pergunta o email da empresa':
                            await SendMessage(jid, { text: 'Digite o E-mail da sua Empresa.' })
                            break
                        case 'pergunta o ramo da empresa':
                            await SendMessage(jid, { text: 'Digite o ramo de atividade da sua Empresa.' })
                            break
                        case 'confirmar dados da empresa':
                            const buttons34 = [
                                { buttonId: 'simDadosEmpresa', buttonText: { displayText: 'Sim' }, type: 1 },
                                { buttonId: 'nãoDadosEmpresa', buttonText: { displayText: 'Não' }, type: 1 },
                            ]

                            const buttonMessage34 = {
                                text: ``,
                                footer: 'escolha uma das opções abaixo!',
                                buttons: buttons34,
                                headerType: 1
                            }

                            await SendMessage(jid, {
                                text:
                                    `*Os dados abaixo estão corretos?*\n\n${userInfo.nome_empresa}\n${userInfo.endereco_empresa}\n${userInfo.cep_empresa}\n${userInfo.email_empresa}\n${userInfo.ramo_de_atividade}` + '\n\n' +
                                    '*👉🏽 Sim*' + '\n' +
                                    '*👉🏽 Não*'
                            })
                            break
                        case 'Cancelou o cadastro da empresa':
                            const buttons35 = [
                                { buttonId: 'Menu inicial', buttonText: { displayText: 'Menu inicial' }, type: 1 },
                                { buttonId: 'Eu empresabtn', buttonText: { displayText: 'Cadastrar Novamente' }, type: 1 },
                            ]

                            const buttonMessage35 = {
                                text: `Cadastro cancelado, escolha uma das opções abaixo!`,
                                footer: 'escolha uma das opções abaixo!',
                                buttons: buttons35,
                                headerType: 1
                            }

                            await SendMessage(jid, {
                                text:
                                    'Cadastro cancelado, digite qualquer coisa para voltar ao menu inicial!'
                            })
                            break
                        case 'empresa cadastrada com sucesso':
                            await SendMessage(
                                jid,
                                {
                                    image: fs.readFileSync("img/empresa.jpeg"),
                                    caption: `*Certificado Digital*\n\nOrgulhosamente certificamos a empresa *${userInfo.nome_empresa}* de forma voluntaria, de própria iniciativa e livre decisão, aderiu á causa não violência contra mulher e sua autenticação cadastral consta em nossas diretrizes do projeto *Diario de Luzia* lei n° 9.608/1998 que rege o trabalho voluntário.\n\nEntenda o que é ser voluntário\n\nSer voluntário é demonstrar seu apoio a um dos principios básicos das *Nações Unidas*\nO trabalho conjunto pode tornar o mundo o lugar melhor para todos.\nO voluntário benificia a sociedade em geral e melhora a vida das pessoas incluindo a dos próprios voluntarios\n\n Obrigado pela nobre iniciativa de entrar para a nossa comunidade de empresas e pessoas que reconhecem que\n*Essa causa é de todos*.`,
                                    gifPlayback: false
                                }
                            )
                            const buttons36 = [
                                { buttonId: 'Menu inicial', buttonText: { displayText: 'Menu inicial' }, type: 1 },

                            ];

                            const buttonMessage36 = {
                                text: `Formulário enviado com sucesso!`,
                                footer: 'Para continuar, aperte o botão abaixo!',
                                buttons: buttons36,
                                headerType: 1
                            }
                            await SendMessage(jid, {
                                text:
                                    'Formulário enviado com sucesso!' + '\n\n' +
                                    'Digite qualquer coisa para continuar'
                            })
                            break
                        case 'Perguntar o nome do embaixador':
                            await SendMessage(jid, { text: 'digite para mim seu nome completo por favor.' })
                            break
                        case 'perguntar o cep do Embaixador':
                            await SendMessage(
                                jid,
                                {
                                    image: fs.readFileSync("img/cep.jpeg"),
                                    caption: "Digite seu CEP.\n\nCaso não saiba seu CEP, clique no link abaixo para consultar.\r\n🔗📲https://buscacepinter.correios.com.br/app/endereco/index.php",
                                    gifPlayback: false
                                }
                            )
                            break
                        case 'perguntar data de nascimento do embaixador':
                            SendMessage(jid, { text: 'Digite sua data de nascimento.\n\n*Exemplo: 24/05/1980*' })
                            break
                        case 'perguntar email do embaixador':
                            SendMessage(jid, { text: 'Digite seu E-mail.' })
                            break
                        case 'Embaxador cadastrado com sucesso':
                            const buttons40 = [
                                { buttonId: 'Menu inicial', buttonText: { displayText: 'Menu inicial' }, type: 1 },

                            ];
                            const buttonMessage40 = {
                                image: { url: './img/certificadoEmbaixador.jpeg' },
                                caption: `*CERTIFICADO*\n\nORGULHOSAMENTE CERTIFICAMOS QUE VOCÊ VOLUNTÁRIO(A) Por sua própria iniciativa e livre decisão, aderiu à causa: não a violência contra a mulher e sua autenticação cadastral consta em nossas diretrizes do projeto DIARIO DE LUZIA lei n° 9.608/1998 que rege o trabalho voluntário.\n\nSer voluntário é  demonstrar seu apoio a um dos princípios básicos das Nações Unidas. O trabalho conjunto pode tornar o mundo um melhor lugar para todos. O voluntariado beneficia a sociedade em geral e melhora a vida das pessoas incluindo a dos próprios voluntários.\n\nObrigado por sua iniciativa de entrar para  nossa comunidade de pessoas que não se calam e reconhecem que;\n*está causa é de todos nós.*`,
                                footer: 'Dica: Clique no botão abaixo!',
                                buttons: buttons40,
                                headerType: 4
                            }
                            await SendMessage(
                                jid,
                                {
                                    image: fs.readFileSync("img/certificadoEmbaixador.jpeg"),
                                    caption: `*CERTIFICADO*\n\nORGULHOSAMENTE CERTIFICAMOS QUE VOCÊ VOLUNTÁRIO(A) Por sua própria iniciativa e livre decisão, aderiu à causa: não a violência contra a mulher e sua autenticação cadastral consta em nossas diretrizes do projeto DIARIO DE LUZIA lei n° 9.608/1998 que rege o trabalho voluntário.\n\nSer voluntário é  demonstrar seu apoio a um dos princípios básicos das Nações Unidas. O trabalho conjunto pode tornar o mundo um melhor lugar para todos. O voluntariado beneficia a sociedade em geral e melhora a vida das pessoas incluindo a dos próprios voluntários.\n\nObrigado por sua iniciativa de entrar para  nossa comunidade de pessoas que não se calam e reconhecem que;\n*está causa é de todos nós.*`,
                                    gifPlayback: false
                                }
                            )
                            await SendMessage(jid, {
                                text:
                                    'Formulário enviado com sucesso!' + '\n\n' +
                                    'Digite qualquer coisa para continuar'
                            })
                            break
                        case 'O usuário entrou em Acolha-me':
                            await SendMessage(
                                jid,
                                {
                                    image: fs.readFileSync("img/euacolho.jpeg"),
                                    caption: "Em caso de real necessidade e extrema emergência, conte com a rede de apoio de acolhimento disponível em todas as cidades adeptas ao projeto Diário de Luzia.Toque no papel de parede em tela cheia e mostre a uma empresa parceira e você será acolhida com os mais variados produtos e serviços disponíveis em várias cidades do Brasil.",
                                    gifPlayback: false
                                }
                            )
                            await SendMessage(jid, { text: 'consulte a lista de seguimentos, empresas que você mulher (em vulnerabilidade, vítima de violência) pode ser acolhida e generosamente beneficiada.' })
                            await SendMessage(jid, { text: '1️⃣ clínica/consultório terapêutico\nDisponibiliza de forma voluntária (X?) gratuitamente consulta, exames, tratamentos, terapia para mulheres vítimas de violência.\n\n2️⃣ Escritório advocatícios\nDisponibiliza acessória jurídica gratuita a mulheres  vítimas de violência\n\n3️⃣instituições religiosas, grupos de casais, ongs, institutos associações de bairros e outros Disponibiliza seminários, reuniões, palestras de Cascais.\n\n4️⃣ Hotéis/pousadas\nDisponibiliza Hospedagem/abrigo emergencial a mulheres  vítimas de violência)\n\n5️⃣companhia de transportes:\nDisponibiliza transportes, passagens, ingressos emergenciais a mulhetes vítimas de violência:\n\nTaxi,  ônibus, Mototaxi e outros.\n\n6️⃣Super mercados:\nDisponibilizar cestas básicas a mulhetes em vulnerabilidades vítimas de violência\n\n7️⃣Farmácias e drogarias:\nReceitas, produtos  e Medicamentos a mulheres em vulnerabilidade vítimas de violência.\n\n8️⃣outros seguimentos...' })
                            //await SendMessage(jid, { text: 'ATENÇÃO ⚠️\nPara seu conhecimento\nEsse formato de  adesivo ou cartaz é uma referência e identificação de que a empresa  é parceira voluntária, adepta e apoia o projeto\n*EU ACOLHO Diário de Luzia que acolhe e ajuda  mulheres em vulnerabilidade social  vítimas de violência.👇🏼*' })

                            break
                        case 'O usuário entrou em Direitos Humanos':
                            try {
                                const buttons22 = [
                                    { buttonId: 'Menu inicial', buttonText: { displayText: 'Menu inicial' }, type: 1 },

                                ];

                                const buttonMessage22 = {
                                    text: `Para continuar, aperte o botão abaixo!`,
                                    footer: '',
                                    buttons: buttons22,
                                    headerType: 1
                                }
                                await SendMessage(
                                    jid,
                                    {
                                        image: fs.readFileSync("img/direitosHumanos.jpeg"),
                                        caption: "Em caso de constatação de violação dos direitos humanos\n\n*Disque 🆘📞📲👉* 100\n\n*Ou clique no link*\n\nhttps://mdh.metasix.solutions/portal/serviços",
                                        gifPlayback: false
                                    }
                                )
                                await SendMessage(jid, {
                                    text:
                                        'Digite qualquer coisa para voltar ao menu inicial'
                                })
                            } catch (error) {

                            }

                            break
                        case 'O usuário entrou em Mais opções':
                            try {
                                const buttons22 = [
                                    { buttonId: 'Publicidade social', buttonText: { displayText: 'Publicidade social' }, type: 1 },
                                    // { buttonId: 'Enviar Feedback', buttonText: { displayText: 'Enviar Feedback' }, type: 1 },
                                    // { buttonId: 'Livro Luiza-Homem', buttonText: { displayText: 'Livro Luiza-Homem' }, type: 1 },
                                ];

                                const buttonMessage22 = {
                                    text: `Para continuar, escolha uma das opções abaixo!`,
                                    footer: '',
                                    buttons: buttons22,
                                    headerType: 1
                                }

                                await SendMessage(jid, {
                                    text:
                                        'Escolha uma das opções' + '\n\n' +
                                        '1 - ChatGPT com Luzia' + '\n' +
                                        '2 - Publicidade social'
                                    // '3 - Enviar Feedback'
                                })
                            } catch (error) {

                            }
                            break
                        case 'O usuário entrou em Publicidade social':
                            try {
                                console.log('cheguei aqui')
                                const buttons22 = [
                                    { buttonId: 'Compartilhar Chatbot', buttonText: { displayText: 'Compartilhar Chatbot' }, type: 1 },
                                    { buttonId: 'Menu inicial', buttonText: { displayText: 'Menu inicial' }, type: 1 },

                                ];

                                const buttonMessage22 = {
                                    text: `Para continuar, aperte o botão abaixo!`,
                                    footer: '',
                                    buttons: buttons22,
                                    headerType: 1
                                }
                                await SendMessage(
                                    jid,
                                    {
                                        image: fs.readFileSync("img/dairometro.jpeg"),
                                        caption: `Publique, compartilhe esse banner/Link com sua agenda, redes sociais e contribua com esta causa de forma voluntária.\nAjude a levar está  solução há ao máximo  de mulheres e usuários que você conhecer.\nEsta causa é  de todos.`,
                                        gifPlayback: false
                                    }
                                )
                                await SendMessage(jid, {
                                    text:
                                        'Para continuar, aperte o botão abaixo!' + '\n\n' +
                                        '1 - Compartilhar Chatbot' + '\n' +
                                        '2 - Menu inicial'
                                })
                            } catch (error) {

                            }


                            break
                        case 'O usuário entrou em Compartilhar Chatbot':
                            const ppUrl = await sock.profilePictureUrl(jid, 'image')
                            // console.log("download profile picture from: " + ppUrl)
                            await SendMessage(
                                jid,
                                {
                                    image: { url: ppUrl },
                                    caption: `Publicidade Social\n\n*${nomeUsuario}* Se engajou no Projeto: Diário de Luzia ✋🏼🚫 *Não a violência contra a mulher* e  Está compartilhando com  você e lhe convida a se engajar também como voluntário(a) Compartilhando em sua agenda com amigos e publicando  nas redes sociais esta campanha. contribua com esta causa e ajude  a salvar vidas  de forma  socialmente  voluntária. Se empenha a levar esta   solução ao maior número  de mulheres e E pessoas que você conhece.	*Esta causa é  de toda uma sociedade.* ⚠️Atenção! Compartilhe esse banner na íntegra. Diário de Luzia\n\nhttps://wa.me/5521999186064`,
                                    gifPlayback: false
                                }
                            )
                            await SendMessage(jid, { text: 'Digite qualquer coisa para voltar ao menu inicial' })
                            break
                        case 'entrou no chatgpt':


                            break
                        default:
                            console.log(`fora de qualquer stage`);
                    }
                }


            } catch (error) {

            }


        }
    })

}
Connection()