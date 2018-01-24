//services
const DBService = require('./src/services/dbService');
const OCRService = require('./src/services/ocrService');
const PatentCrawler = require('./src/services/patentCrawler');
//uitls
const patentUtil = require('./src/utils/patentUtil');
const imageUtil = require('./src/utils/imageUtil');
//models
const FutureFee = require('./src/models/futureFee');

const dbService = new DBService();
const ocrService = new OCRService();
const patentCrawler = new PatentCrawler();

let token = "C00D909B92844C4285E26AA9881ED4BE";

//生成所有的任务
async function reGenerateTasks() {
    await dbService.connectIptp();
    await dbService.connectLocal();
    await dbService.deleteAllPatentTasks();
    let colleges = await dbService.getAllColleges();
    for (let i = 0; i < colleges.length; i++) {
        let college = colleges[i];
        let patents = await dbService.getPatentsOfCollege(college.storageId);
        console.log(`${college.name}: ${patents.length} tasks`)
        for (let j = 0; j < patents.length; j++) {
            let patent = patents[j];
            await dbService.createPatentTask(patent);
        }
    }
}

//执行任务
async function start() {
    await dbService.connectLocal();
    const tasks = await dbService.getAllPatentTasks();
    for (let i = 0; i < tasks.length; i++) {
        let task = tasks[i];
        let applyNumber = patentUtil.getPatentApplyNumber(task.patentApplyNumber);
        const feeResult = await patentCrawler
            .getFeeOfPatent(applyNumber, token)
            .catch((err) => {
                patentCrawler.end();
            });
        if (!feeResult) {
            --i;
            continue;
        }
        const futureFees = feeResult.map((data, index) => {
            return new FutureFee(data.feeType, data.feeAmount, data.deadline);
        });
        await dbService.deleteFutureFeeOfPatent(task.patentId);
        const insertResult = await dbService.createPatentFutureFee(task.patentId, task.patentApplyNumber, task.patentTitle, futureFees);
        const updateResult = await dbService.donePatentTask(task.id);
        console.log(task.id);
    }
    console.log("All tasks done!!!");
}

// start();
// reGenerateTasks(); 

async function breakAuth() {
    let accurate = false;
    var clipRect = {
        x: 231,
        y: 289,
        width: 50,
        height: 26
    };
    while (!accurate) {
        await patentCrawler.getAuthImage(clipRect);
        const imgInfo = await imageUtil.imageDenoiseAsync("./assets/authCode.png");
        console.log(imgInfo);
        const resultStr = await ocrService.getVerifyCodeResult();
        const result = JSON.parse(resultStr);
        console.log(result);
        const wordsResult = result["words_result"];
        if (!wordsResult || wordsResult.length === 0) {
            continue;
        }
        accurate = wordsResult[0].probability.average > 0.8;
        if (accurate) {
            let codeText = result.words_result[0].words;
            const pattern = /.*(\d).*([+-]).*(\d)/;
            const match = codeText.match(pattern);
            if (match) {
                let num1 = Number(match[1]);
                let operator = match[2];
                let num2 = Number(match[3]);
                let answer = operator === "+" ? num1 + num2 : num1 - num2;
                let tokenResult = await patentCrawler.getTokenWithAuthCode(answer).catch(() => { });
                token = tokenResult;
                await start();
            } else {
                accurate = false;
                patentCrawler.end();
                continue;
            }
        } else {
            patentCrawler.end();
            continue;
        }
        console.log(result);
    }
}

breakAuth();
// patentCrawler.test();
