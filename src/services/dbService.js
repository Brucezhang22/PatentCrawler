const mysql = require("mysql");
const College = require("../models/college");
const Patent = require("../models/patent");
const PatentTask = require("../models/patentTask");
const config = require("../../config");

const feeTableName = "patent_fee_future";
const taskTableName = "patent_fee_future_task";
const patentTableName = "st_patentinfo_sub1_20180205_thl";

//Constructor
function DBService() {
    this.connection = mysql.createConnection(config.dbConfig);
}

//连接中高平台数据库
DBService.prototype.connectMySql = function () {
    const connection = this.connection;
    return new Promise((resolve, reject) => {
        connection.connect(function (err) {
            if (err) {
                console.error("iptp error connection: " + err.stack);
                reject();
                return;
            }
            console.log("connected to mysql!");
            resolve();
        });
    });
}

//future_fee

//获取指定patent的future fee记录
DBService.prototype.getFutureFeeOfPatent = function (applyNum) {
    const connection = this.connection;
    return new Promise((resolve, reject) => {
        connection.query({
            sql: `select * from ${feeTableName} an = ?`,
            values: [applyNum]
        }, function (error, result, fields) {
            if (error) {
                reject(error);
            }
            resolve(result);
        })
    });
}

//删除一条指定的future fee记录
DBService.prototype.deleteFutureFeeOfPatent = function (applyNum) {
    const connection = this.connection;
    return new Promise((resolve, reject) => {
        connection.query({
            sql: `delete from ${feeTableName} where an = ?`,
            values: [applyNum]
        }, function (error, result, fields) {
            if (error) {
                reject(error);
            }
            resolve(result);
        })
    });
}

//插入一条专利对应的future fee记录
DBService.prototype.createPatentFutureFee = function (an, futureFees) {
    const connection = this.connection;
    return new Promise((resolve, reject) => {
        const feeString = JSON.stringify(futureFees);
        connection.query({
            sql: `insert into ${feeTableName} (an, fees) values(?, ?)`,
            values: [an, feeString]
        }, function (error, result, fields) {
            if (error) {
                reject(error);
            }
            resolve(result);
        });
    });
}

//patent_task

//获取所有未执行的patent_task
DBService.prototype.getAllPatentTasks = function () {
    const connection = this.connection;
    return new Promise((resolve, reject) => {
        connection.query({
            sql: `select * from ${taskTableName} where status = 0`
        }, function (error, result, fields) {
            if (error) {
                reject(error);
            }
            const tasks = result.map((task, index) => {
                return new PatentTask(task["id"], task["an"], task["status"]);
            });
            resolve(tasks);
        });
    });
}

//根据crawler的序号和，总的crawler的个数返回该crawler需要执行的任务
DBService.prototype.getPatentTaskForSingleCrawler = function (crawlerIndex, crawlerCount) {
    const connection = this.connection;
    return new Promise((resolve, reject) => {
        connection.query({
            sql: `select * from ${taskTableName} pt where mod(pt.id, ?) = ? and status = 0`,
            values: [crawlerCount, crawlerIndex]
        }, function (error, result, fields) {
            if (error) {
                reject(error);
            }
            const tasks = result.map((task, index) => {
                return new PatentTask(task["id"], task["an"], task["status"]);
            });
            resolve(tasks);
        });
    });
}

//删除所有的patent_task
DBService.prototype.deleteAllPatentTasks = function () {
    const connection = this.connection;
    return new Promise((resolve, reject) => {
        connection.query({
            sql: `TRUNCATE TABLE ${taskTableName}`
        }, function (error, result, fields) {
            if (error) {
                reject(error);
            }
            resolve(result);
        });
    });
}

//完成一个patent_task任务
DBService.prototype.donePatentTask = function (taskId) {
    const connection = this.connection;
    return new Promise((resolve, reject) => {
        connection.query({
            sql: `update ${taskTableName} set status = 1 where id = ?`,
            values: [taskId]
        }, function (error, result, fields) {
            if (error) {
                reject(error);
            }
            resolve(result);
        });
    });
}

//插入一条任务
DBService.prototype.insertTask = function (patentAN) {
    const connection = this.connection;
    return new Promise((resolve, reject) => {
        connection.query({
            sql: `insert into ${taskTableName} (an, status) values(?, ?)`,
            values: [patentAN, 0]
        }, function (error, result, fields) {
            if (error) {
                reject(error);
            }
            resolve(result);
        });
    });
}

//生成所有任务
DBService.prototype.generateTasks = async function () {
    const connection = this.connection;
    return new Promise((resolve, reject) => {
        connection.query({
            sql: `INSERT INTO ${taskTableName}(an) SELECT AN FROM ${patentTableName}`,
        }, function (error, result, fields) {
            if (error) {
                reject(error);
            }
            resolve(result);
        });
    });
}

module.exports = DBService;