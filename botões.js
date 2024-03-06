const makeWASocket = require('@whiskeysockets/baileys').default
const { delay, DisconnectReason, fetchLatestBaileysVersion, useMultiFileAuthState} = require('@whiskeysockets/baileys')
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
                    diarometroDenuncia
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
                    user.titulo_do_dp = (respList)
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
                    user.titulo_do_dp = (respList)
                    user.nivel_do_dp = 8
                    user.stage = 'perguntar de ela deseja descrever Controlar - proibir'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.listResponseMessage.singleSelectReply.selectedRowId === 'Intimidar - ameaçar' && userInfo.stage === 'mandar a lista do diarometro' && userInfo.bot === true) {
                    user.titulo_do_dp = (respList)
                    user.nivel_do_dp = 9
                    user.stage = 'perguntar de ela deseja descrever Intimidar - ameaçar'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.listResponseMessage.singleSelectReply.selectedRowId === 'Expor a vida intima' && userInfo.stage === 'mandar a lista do diarometro' && userInfo.bot === true) {
                    user.titulo_do_dp = (respList)
                    user.nivel_do_dp = 10
                    user.stage = 'perguntar de ela deseja descrever Expor a vida intima'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.listResponseMessage.singleSelectReply.selectedRowId === 'Destruir bens pessoais' && userInfo.stage === 'mandar a lista do diarometro' && userInfo.bot === true) {
                    user.titulo_do_dp = (respList)
                    user.nivel_do_dp = 11
                    user.stage = 'perguntar de ela deseja descrever Destruir bens pessoais'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.listResponseMessage.singleSelectReply.selectedRowId === 'Machucar - Sacudir' && userInfo.stage === 'mandar a lista do diarometro' && userInfo.bot === true) {
                    user.titulo_do_dp = (respList)
                    user.nivel_do_dp = 12
                    user.stage = 'perguntar de ela deseja descrever Machucar - Sacudir'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.listResponseMessage.singleSelectReply.selectedRowId === 'Brincar de bater' && userInfo.stage === 'mandar a lista do diarometro' && userInfo.bot === true) {
                    user.titulo_do_dp = (respList)
                    user.nivel_do_dp = 13
                    user.stage = 'perguntar de ela deseja descrever Brincar de bater'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.listResponseMessage.singleSelectReply.selectedRowId === 'Empurrar' && userInfo.stage === 'mandar a lista do diarometro' && userInfo.bot === true) {
                    user.titulo_do_dp = (respList)
                    user.nivel_do_dp = 14
                    user.stage = 'perguntar de ela deseja descrever Empurrar'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.listResponseMessage.singleSelectReply.selectedRowId === 'Xingar' && userInfo.stage === 'mandar a lista do diarometro' && userInfo.bot === true) {
                    user.titulo_do_dp = (respList)
                    user.nivel_do_dp = 15
                    user.stage = 'perguntar de ela deseja descrever Xingar'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.listResponseMessage.singleSelectReply.selectedRowId === 'Diminuir a autoestima' && userInfo.stage === 'mandar a lista do diarometro' && userInfo.bot === true) {
                    user.titulo_do_dp = (respList)
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
                    user.titulo_do_dp = (respList)
                    user.nivel_do_dp = 17
                    user.stage = 'perguntar de ela deseja descrever Impedir de prevenir a gravidez'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.listResponseMessage.singleSelectReply.selectedRowId === 'Dar tapas' && userInfo.stage === 'mandar a lista do diarometro' && userInfo.bot === true) {
                    user.titulo_do_dp = (respList)
                    user.nivel_do_dp = 18
                    user.stage = 'perguntar de ela deseja descrever Dar tapas'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.listResponseMessage.singleSelectReply.selectedRowId === 'Chutar' && userInfo.stage === 'mandar a lista do diarometro' && userInfo.bot === true) {
                    user.titulo_do_dp = (respList)
                    user.nivel_do_dp = 19
                    user.stage = 'perguntar de ela deseja descrever Chutar'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.listResponseMessage.singleSelectReply.selectedRowId === 'Confinar - Prender' && userInfo.stage === 'mandar a lista do diarometro' && userInfo.bot === true) {
                    user.titulo_do_dp = (respList)
                    user.nivel_do_dp = 20
                    user.stage = 'perguntar de ela deseja descrever Confinar - Prender'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.listResponseMessage.singleSelectReply.selectedRowId === 'Ameaçar com objetos ou armas' && userInfo.stage === 'mandar a lista do diarometro' && userInfo.bot === true) {
                    user.titulo_do_dp = (respList)
                    user.nivel_do_dp = 21
                    user.stage = 'perguntar de ela deseja descrever Ameaçar com objetos ou armas'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.listResponseMessage.singleSelectReply.selectedRowId === 'Forçar relação sexual' && userInfo.stage === 'mandar a lista do diarometro' && userInfo.bot === true) {
                    user.titulo_do_dp = (respList)
                    user.nivel_do_dp = 22
                    user.stage = 'perguntar de ela deseja descrever Forçar relação sexual'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.listResponseMessage.singleSelectReply.selectedRowId === 'Obrigar a abortar' && userInfo.stage === 'mandar a lista do diarometro' && userInfo.bot === true) {
                    user.titulo_do_dp = (respList)
                    user.nivel_do_dp = 23
                    user.stage = 'perguntar de ela deseja descrever Obrigar a abortar'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.listResponseMessage.singleSelectReply.selectedRowId === 'Causar lesão corporal grave - Mutilar' && userInfo.stage === 'mandar a lista do diarometro' && userInfo.bot === true) {
                    user.titulo_do_dp = (respList)
                    user.nivel_do_dp = 24
                    user.stage = 'perguntar de ela deseja descrever Causar lesão corporal grave - Mutilar'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.listResponseMessage.singleSelectReply.selectedRowId === 'Ameaçar de morte' && userInfo.stage === 'mandar a lista do diarometro' && userInfo.bot === true) {
                    user.titulo_do_dp = (respList)
                    user.nivel_do_dp = 25
                    user.stage = 'perguntar de ela deseja descrever Ameaçar de morte'
                    fs.writeFileSync(filePath, JSON.stringify(user, null, 1,), 'utf-8')
                }
                if (msg.message.listResponseMessage.singleSelectReply.selectedRowId === 'MATAR' && userInfo.stage === 'mandar a lista do diarometro' && userInfo.bot === true) {
                    user.titulo_do_dp = (respList)
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
                // console.log(msg.message.conversation)
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
                    case '':
                        break
                    case '':
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
                        //MENSAGEM DE WELCOME
                        case 'inicial':
                            const buttons333 = [
                                { buttonId: 'id1', buttonText: { displayText: 'Button 1' }, type: 1 },
                                { buttonId: 'id2', buttonText: { displayText: 'Button 2' }, type: 1 },
                                { buttonId: 'id3', buttonText: { displayText: 'Button 3' }, type: 1 }
                            ]

                            const buttonMessage333 = {
                                text: "Hi it's button message",
                                footer: 'Hello World',
                                buttons: buttons333,
                                headerType: 1
                            }

                            SendMessage(jid, buttonMessage333)
                            const buttons = [
                                { buttonId: 'Eu mulher', buttonText: { displayText: '🙋‍♀️ Eu mulher 💋💄' }, type: 1 },
                                { buttonId: 'Eu voluntário', buttonText: { displayText: '✌️ Eu voluntário' }, type: 1 },
                                { buttonId: 'Mais opções', buttonText: { displayText: '➕ Mais opções' }, type: 1 },
                            ];
                            const buttonMessage = {
                                text: `👩‍⚖️ Olá\r\nseja bem vinda ao meu mundo!\r\nsou a LUZIA ! Sua amiga e conselheira virtual.\r\nMinha missão na terra é lutar pelo fim da violência contra a mulher.\r\nQUAL É SUA MISSÃO???\r\nlhe convido a entrar e juntar-se comigo nessa causa.\r\nsendo uma VÍTIMA ou VOLUNTÁRIO\r\nentre para nossa comunidade e conheça toda nossa rede de apoio e acolhimento.\r\nLEMBRE-SE!!!\r\nvocê não está sozinha!\r\nReaja em quanto há tempo! ou entre para uma legião de voluntariados que apoiam direto ou indiretamente.`,
                                footer: 'Escolha uma das opções abaixo!',
                                buttons: buttons,
                                headerType: 1
                            }
                            await SendMessage(jid, buttonMessage)
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
                            const buttons2 = [
                                { buttonId: 'Canais de denuncia', buttonText: { displayText: 'Canais de denuncia 🆘' }, type: 1 },
                                { buttonId: 'Diarômetro', buttonText: { displayText: 'Diarômetro 🌡️' }, type: 1 },
                                { buttonId: 'Anjo da Guarda', buttonText: { displayText: 'Anjo da Guarda 👼' }, type: 1 },
                            ];
                            const buttonMessage2 = {
                                text: `Parabéns ${userInfo.apelido}\r\npela iniclativa de se mobilizar, fazendo parte de nossa comunidade e contar com toda nossa rede de apoio.\r\na partir de agora, somos amigas e parceiras ! Sempre que precisar é só me acionar!\r\nLembre-se.\r\nVocê não está Sozinha!\r\nQuem te proteje nunca dorme.`,
                                footer: 'Escolha uma das opções abaixo!',
                                buttons: buttons2,
                                headerType: 1
                            }
                            await SendMessage(jid, { text: 'Ok, cadastro feito com sucesso!' })
                            await SendMessage(jid, buttonMessage2);
                            break;
                        case 'escolheu canais de denuncia':
                            const buttons3 = [
                                { buttonId: 'Disque emergência', buttonText: { displayText: 'Disque Emergência' }, type: 1 },
                                { buttonId: 'Denúncia', buttonText: { displayText: 'Denúncia' }, type: 1 },
                                { buttonId: 'Papel de Parede', buttonText: { displayText: 'Sinal de ameaça' }, type: 1 },
                            ];
                            const buttonMessage3 = {
                                text: `Parabéns ${userInfo.apelido}\r\npela iniclativa de se mobilizar, fazendo parte de nossa comunidade e contar com toda nossa rede de apoio.\r\na partir de agora, somos amigas e parceiras ! Sempre que precisar é só me acionar!\r\nLembre-se.\r\nVocê não está Sozinha!\r\nQuem te proteia nunca Dorme.`,
                                footer: 'Escolha uma das opções abaixo!',
                                buttons: buttons3,
                                headerType: 1
                            }
                            await SendMessage(jid, buttonMessage3);
                            break
                        case 'escolheu denuncia':
                            const buttons4 = [
                                { buttonId: 'Para Mim Mesmo', buttonText: { displayText: 'Para Mim Mesmo' }, type: 1 },
                                { buttonId: 'Para terceiros', buttonText: { displayText: 'Para terceiros' }, type: 1 },

                            ];
                            const buttonMessage4 = {
                                text: `A denúncia é...`,
                                footer: 'Escolha uma das opções abaixo!',
                                buttons: buttons4,
                                headerType: 1
                            }
                            await SendMessage(jid, buttonMessage4)

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
                            const buttons21 = [
                                { buttonId: 'Denunciar novamente', buttonText: { displayText: 'Denunciar novamente' }, type: 1 },
                                { buttonId: 'Menu inicial', buttonText: { displayText: 'Menu inicial' }, type: 1 },

                            ];

                            const buttonMessage21 = {
                                text: `Sua denúncia foi enviada com sucesso!`,
                                footer: 'qual é a sua próxima ação ?',
                                buttons: buttons21,
                                headerType: 1
                            }

                            await SendMessage(jid, buttonMessage21)
                            break
                        case 'pergunta se quer enviar o depoimento':
                            const buttons7 = [
                                { buttonId: 'SimEnviardp', buttonText: { displayText: 'Sim' }, type: 1 },
                                { buttonId: 'NãoEnviardp', buttonText: { displayText: 'Não' }, type: 1 },

                            ];
                            const buttonMessage7 = {
                                text: `O texto acima está correto?`,
                                footer: 'Escolha uma das opções abaixo!',
                                buttons: buttons7,
                                headerType: 1
                            }
                            await SendMessage(jid, buttonMessage7);
                            break
                        case 'confirmou o depoimento': //se o depoimento estiver correto
                            SendMessage(jid, { text: 'Sua denuncia foi enviada e será mantido o devido sigilo.' })
                            break
                        case 'cancelou o depoimento': //se o depoimento não estiver correto
                            const buttons23 = [
                                { buttonId: 'Denunciar novamente', buttonText: { displayText: 'Denunciar novamente' }, type: 1 },
                                { buttonId: 'Menu inicial', buttonText: { displayText: 'Menu inicial' }, type: 1 },

                            ];

                            const buttonMessage23 = {
                                text: `Sua denuncia não foi enviada.`,
                                footer: 'Escolha uma das opções abaixo!',
                                buttons: buttons23,
                                headerType: 1
                            }

                            await SendMessage(jid, buttonMessage23)

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
                            await SendMessage(jid, buttonMessage8);
                            break
                        case 'mandar a lista do diarometro': //diarometro
                            const sections = [
                                {
                                    title: "Fique atenta! 😨.",
                                    rows: [
                                        { title: "Nível 1 - Piadas ofensivas", rowId: "Piadas ofensivas", },
                                        { title: "Nível 2 - Chantagem", rowId: "Chantagem", },
                                        { title: "Nível 3 - Mentir - Enganar", rowId: "Mentir - Enganar", },
                                        { title: "Nível 4 - Culpar", rowId: "Culpar", },
                                        { title: "Nível 5 - Desqualificar", rowId: "Desqualificar", },
                                        { title: "Nível 6 - Ridicularizar - Ofender", rowId: "Ridicularizar - Ofender", },
                                        { title: "Nível 7 - Humilhar em publico", rowId: "Humilhar em publico", },
                                        { title: "Nível 8 - Controlar - proibir", rowId: "Controlar - proibir", }
                                    ]
                                },
                                {
                                    title: "Reaja! 😰.",
                                    rows: [
                                        { title: "Nível 9 - Intimidar - ameaçar", rowId: "Intimidar - ameaçar", },
                                        { title: "Nível 10 - Expor a vida intima", rowId: "Expor a vida intima", },
                                        { title: "Nível 11 - Destruir bens pessoais", rowId: "Destruir bens pessoais", },
                                        { title: "Nível 12 - Machucar - Sacudir", rowId: "Machucar - Sacudir", },
                                        { title: "Nível 13 - Brincar de bater", rowId: "Brincar de bater", },
                                        { title: "Nível 14 - Empurrar", rowId: "Empurrar", },
                                        { title: "Nível 15 - Xingar", rowId: "Xingar", },
                                        { title: "Nível 16 - Diminuir a autoestima", rowId: "Diminuir a autoestima", },
                                        { title: "Nível 17 - Impedir de prevenir a gravidez", rowId: "Impedir de prevenir a gravidez", },
                                    ]
                                },
                                {
                                    title: "Procure ajuda! 😱🧐😡.",
                                    rows: [
                                        { title: "Nível 18 - Dar tapas", rowId: "Dar tapas", },
                                        { title: "Nível 19 - Chutar", rowId: "Chutar", },
                                        { title: "Nível 20 - Confinar - Prender", rowId: "Confinar - Prender", },
                                        { title: "Nível 21 - Ameaçar com objetos ou armas", rowId: "Ameaçar com objetos ou armas", },
                                        { title: "Nível 22 - Forçar relação sexual", rowId: "Forçar relação sexual", },
                                        { title: "Nível 23 - Obrigar a abortar", rowId: "Obrigar a abortar", },
                                        { title: "Nível 24 - Causar lesão corporal grave - Mutilar", rowId: "Causar lesão corporal grave - Mutilar", },
                                        { title: "Nível 25 - Ameaçar de morte", rowId: "Ameaçar de morte", },
                                        { title: "Nível 26 - MATAR", rowId: "MATAR", },
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
                            await SendMessage(jid, listMessage)
                            break
                        case 'eu mulher ja cadastrado':
                            const buttons6 = [
                                { buttonId: 'Canais de denuncia', buttonText: { displayText: 'Canais de denuncia 🆘' }, type: 1 },
                                { buttonId: 'Diarômetro', buttonText: { displayText: 'Diarômetro 🌡️' }, type: 1 },
                                { buttonId: 'Anjo da Guarda', buttonText: { displayText: 'Anjo da Guarda 👼' }, type: 1 },
                            ];
                            const buttonMessage6 = {
                                text: `👩🏻‍💼 Que bom ${userInfo.apelido}, ter você aqui mais vez e contar com sua participação ativa e importante para nossa causa ! `,
                                footer: 'Escolha uma das opções abaixo!',
                                buttons: buttons6,
                                headerType: 1
                            }

                            await SendMessage(jid, buttonMessage6);
                            break
                        case 'mandar lista de numeros de emergencia':
                            const vcard = 'BEGIN:VCARD\n'
                                + 'VERSION:3.0\n'
                                + 'FN:Ouvidoria da Mulher\n'
                                + 'ORG:Ouvidoria da Mulher;\n'
                                + 'TEL;type=CELL;type=VOICE;waid=5561996565008:+55 61 99656 5008\n'
                                + 'END:VCARD'

                            const buttons22 = [
                                { buttonId: 'Menu inicial', buttonText: { displayText: 'Menu inicial' }, type: 1 },

                            ];

                            const buttonMessage22 = {
                                text: `Em caso de emergência de uma grave ameaça, acione as forças de segurança: polícia 📞📲 190 🚔🆘`,
                                footer: 'Para continuar, aperte o botão abaixo!',
                                buttons: buttons22,
                                headerType: 1
                            }

                            await SendMessage(jid, { contacts: { displayName: 'Ouvidoria da Mulher', contacts: [{ vcard }] } })
                            await SendMessage(jid, buttonMessage22)

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
                            await SendMessage(jid, buttonMessage9);
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
                            await SendMessage(jid, buttonMessage10);
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
                            await SendMessage(jid, buttonMessage26)
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
                            await SendMessage(jid, buttonMessage37)
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
                            const buttonMessage11 = {
                                //Muito bem ${userInfo.apelido}!Por você estar atenta e reconhecer que (${userInfo.titulo_do_dp}) é o ( 18° ) passo para tentar mudar o rumo da história da sua vida, e  não  deixar chegar às últimas consequências.(feminicidio) Você já é vítima de violência física e de uma grave ameaça! Se não procurou as autoridades ou registrou o BO, (Boletim de ocorrência)ou solicitou uma ME(Medida Protetiva) faça isso o mais rápido possível.\nÉ sua integridade física ou sua própria vida que está em jogo! Aínda há  tempo de reverter esse quadro!
                                text: `Muito bem ${userInfo.apelido}!\nPor você estar atenta e reconhecer que (${userInfo.titulo_do_dp}) é o ( 2° ) passo para tentar mudar o rumo da história da sua vida, e  não  deixar chegar às últimas consequências.(feminicidio) Você já é vítima de violência física e de uma grave ameaça! Se não procurou as autoridades ou registrou o BO, (Boletim de ocorrência)ou solicitou uma ME(Medida Protetiva) faça isso o mais rápido possível.\nÉ sua integridade física ou sua própria vida que está em jogo! Aínda há  tempo de reverter esse quadro!`,
                                footer: 'Escolha uma das opções abaixo!',
                                buttons: buttons11,
                                headerType: 1
                            }
                            await SendMessage(jid, buttonMessage11);
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
                            await SendMessage(jid, buttonMessage12);
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
                            await SendMessage(jid, buttonMessage13);
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
                            await SendMessage(jid, buttonMessage14);
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
                            await SendMessage(jid, buttonMessage15);
                            break
                        case 'perguntar de ela deseja descrever Humilhar em publico':
                            const buttons38 = [
                                { buttonId: 'SimEnviarDpDiarometro', buttonText: { displayText: 'Sim' }, type: 1 },
                                { buttonId: 'NaoEnviarDpDiarometro', buttonText: { displayText: 'Não' }, type: 1 },

                            ];
                            const buttonMessage38 = {
                                text: `*Humilhar em publico.*\n\nQue bom ${userInfo.apelido}, por você estar atenta e reconhecer que (Humilhar em publico) é o setimo (${userInfo.nivel_do_dp}) passo para tentar mudar o rumo da história da sua vida.\n\n*Deseja descrever a ação como ocorreu?*`,
                                footer: 'Escolha uma das opções abaixo!',
                                buttons: buttons38,
                                headerType: 1
                            }
                            await SendMessage(jid, buttonMessage38);
                            break
                        case 'perguntar de ela deseja descrever Controlar - proibir':
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
                                await SendMessage(jid, buttonMessage39);
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
                                await SendMessage(jid, buttonMessage39);
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
                                await SendMessage(jid, buttonMessage39);
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
                                await SendMessage(jid, buttonMessage39);
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
                                await SendMessage(jid, buttonMessage39);
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
                                await SendMessage(jid, buttonMessage39);
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
                                await SendMessage(jid, buttonMessage39);
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
                                await SendMessage(jid, buttonMessage39);
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
                                await SendMessage(jid, buttonMessage39);
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
                                await SendMessage(jid, buttonMessage39);
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
                                await SendMessage(jid, buttonMessage39);
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
                                await SendMessage(jid, buttonMessage39);
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
                                await SendMessage(jid, buttonMessage39);
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
                                await SendMessage(jid, buttonMessage39);
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
                                await SendMessage(jid, buttonMessage39);
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
                                await SendMessage(jid, buttonMessage39);
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
                                await SendMessage(jid, buttonMessage39);
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
                                await SendMessage(jid, buttonMessage39);
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
                                await SendMessage(jid, buttonMessage39);
                            } catch (error) {

                            }
                            break
                        case 'escolheu anjo da guarda vazio':
                            const buttons16 = [
                                { buttonId: 'simAddNumVazio', buttonText: { displayText: 'Sim' }, type: 1 },
                                { buttonId: 'naoAddNumVazio', buttonText: { displayText: 'Não' }, type: 1 },

                            ];
                            const buttonMessage16 = {
                                text: `${userInfo.apelido} a lista de contatos está vazia, deseja adicionar algum número?`,
                                footer: 'Escolha uma das opções abaixo!',
                                buttons: buttons16,
                                headerType: 1
                            }
                            await SendMessage(jid, buttonMessage16);
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
                            await SendMessage(jid, buttonMessage18);
                            break
                        case 'confirmou o numero que digitou':

                            const buttons19 = [
                                { buttonId: 'enviar notificacao', buttonText: { displayText: 'Sim' }, type: 1 },
                                { buttonId: 'voltar para menu', buttonText: { displayText: 'Não' }, type: 1 },
                                { buttonId: 'maisopções', buttonText: { displayText: 'Mais opções' }, type: 1 },


                            ];
                            const buttonMessage19 = {
                                text: `${userInfo.apelido} deseja enviar a notificação para os números abaixo?\n\n${userInfo.numerosAnjo.join('\n')}`,
                                footer: 'Escolha uma das opções abaixo!',
                                buttons: buttons19,
                                headerType: 1
                            }
                            await SendMessage(jid, buttonMessage19);
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
                                text: `${userInfo.apelido}, escolha uma das opções abaixo!`,
                                footer: 'Escolha uma das opções abaixo!',
                                buttons: buttons27,
                                headerType: 1
                            }
                            await SendMessage(jid, buttonMessage27);
                            break
                        case 'entrou no eu voluntario':
                            const buttons28 = [
                                { buttonId: 'Canais de denuncia 2', buttonText: { displayText: 'Canais de denúncia' }, type: 1 },
                                { buttonId: 'Eu apoio', buttonText: { displayText: 'Eu acolho' }, type: 1 },
                                { buttonId: 'Acolha-me', buttonText: { displayText: 'Acolha-me' }, type: 1 },
                            ];

                            const buttonMessage28 = {
                                text: `Que bom ter você aqui como voluntário.\nestou ciente que você é uma empresa ou pessoa que não se conforma com a violência contra a mulher e quer fazer a diferença\ndenunciando, acolhendo ou sendo acolhida de forma ativa e socialmente participativa!`,
                                footer: 'Escolha uma das opções abaixo!',
                                buttons: buttons28,
                                headerType: 1
                            }
                            await SendMessage(jid, buttonMessage28);
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
                            await SendMessage(jid, buttonMessage29);
                            break
                        case 'entrou no disque emergencia 2':
                            const buttons30 = [
                                { buttonId: 'Menu inicial', buttonText: { displayText: 'Menu inicial' }, type: 1 },

                            ];

                            const buttonMessage30 = {
                                text: '*Polícia Militar (190)*\n\nO trabalho da polícia é garantir a segurança da população, a ordem pública e o cumprimento das leis. Sempre que sofrer ou presenciar algum crime que represente riscos para as pessoas, como assaltos, roubos ou agressões.A PM pode ser acionada em casos de perturbação da ordem pública, uma festa com som alto, que incomode a vizinhança tarde da noite.\n\n*Samu (192)*\n\nNos casos de emergências médicas, o mais indicado é acionar o Serviço de Atendimento Médico de Urgência. O SAMU conta com ambulâncias equipadas e equipe médica qualificada para prestar os atendimentos de emergências o mais rápido possível. Basta ligar para o número 192 e relatar o ocorrido, que uma ambulância será encaminhada até o local.\n\n*Bombeiros (193)*\n\nGrande parte dos acidentes que representam riscos para as pessoas podem ser amenizadas com o socorro imediato do Corpo de Bombeiros. Situações como: resgate de pessoas ou animais; inundação e desabamento; incêndio; afogamento; acidente com animal peçonhento entre outros.\n\n*A Central de Atendimento à Mulher*\n\nLigue 180 é um serviço atualmente oferecido pela Ouvidoria Nacional dos Direitos Humanos do Ministério da Mulher, da Família e dos Direitos Humanos (MMFDH). É uma política pública essencial para o enfrentamento à violência contra a mulher em âmbito nacional e internacional.',
                                footer: 'Para continuar, aperte o botão abaixo!',
                                buttons: buttons30,
                                headerType: 1
                            }
                            await SendMessage(jid, buttonMessage30)
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
                            await SendMessage(jid, buttonMessage31);
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

                            await SendMessage(jid, buttonMessage32)
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

                            await SendMessage(jid, buttonMessage33)
                            break
                        case 'entrou em eu apoio':


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
                                text: `*Os dados abaixo estão corretos?*\n\n${userInfo.nome_empresa}\n${userInfo.endereco_empresa}\n${userInfo.cep_empresa}\n${userInfo.email_empresa}\n${userInfo.ramo_de_atividade}`,
                                footer: 'escolha uma das opções abaixo!',
                                buttons: buttons34,
                                headerType: 1
                            }

                            await SendMessage(jid, buttonMessage34)
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

                            await SendMessage(jid, buttonMessage35)
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
                            await SendMessage(jid, buttonMessage36)
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
                            SendMessage(jid, buttonMessage40)
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
                                await SendMessage(jid, buttonMessage22)
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

                                await SendMessage(jid, buttonMessage22)
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
                                await SendMessage(jid, buttonMessage22)
                            } catch (error) {

                            }


                            break
                        case 'O usuário entrou em Compartilhar Chatbot':
                            const ppUrl = await sock.profilePictureUrl(jid, 'image')
                            console.log("download profile picture from: " + ppUrl)
                            await SendMessage(
                                jid,
                                {
                                    image: { url: ppUrl },
                                    caption: `Publique, compartilhe esse banner/Link com sua agenda, redes sociais e contribua com esta causa de forma voluntária.\nAjude a levar está  solução há ao máximo  de mulheres e usuários que você conhecer.\nEsta causa é  de todos.`,
                                    gifPlayback: false
                                }
                            )

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