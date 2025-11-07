const InverseSeverity = {
    0: 'EMERGENCY',
    1: 'ALERT    ',
    2: 'CRITICAL ',
    3: 'ERROR    ',
    4: 'WARNING  ',
    5: 'NOTICE   ',
    6: 'INFO     ',
    7: 'DEBUG    ',
    8: 'DEBUG    ',
    9: 'NETWORK  ',
    10: 'DATA     '
};

if (!global.auditLogger) { // Running client-side
    global.auditLogger = {
        report: function(system, severity, message, ...data) {
            try {
                if (severity === 'error') {
                    console.trace(system + ": " + severity + ": " + message + ": " + data);
                } else {
                    console.log(system + ": " + severity + ": " + message + ": " + data);
                }
            } catch (ex) {
                console.trace("Could not log error message.");
            }
        },
        SyslogFacility: {
            USER: 1, // user
            DAEMON: 3, // daemon - anything that runs in the background like jobs
            AUTH: 4, // auth - anything that deals with authentication or authorization
            FTP: 11, // ftp - transferring files in and out of the server
            NETWORK: 16, // local0 - network traffic related like HTTP POST, GET, and DELETE
            STORAGE: 17, // local1 - things like DBs
            STANDARD: 18, // local2 - anything that doesn't fit into other categories most likely goes here
            SECURITY: 23
        },
        LogCategory: {
            SYSTEM: 'sys',
            AUTH: 'auth',
            MESSAGE: 'msg',
            FILE_SYSTEM: 'fs',
            NETWORK: 'net',
            STORAGE: 'sto',
            ADAPTER: 'ada',
            PROFILE: 'pro',
            SECURITY: 'sec'
        },
        Severity: {
            EMERGENCY: 0, // system isn't working
            ALERT: 1, // system needs attention
            CRITICAL: 2, // code path has failed
            ERROR: 3, // code path has failed, but can recover
            WARNING: 4, // unusual conditions
            NOTICE: 5, // normal but unlikely
            INFO: 6, // normal
            DEBUG: 7, // extra information
            SERVICE: 8,
            NETWORK: 9, // traffic information
            DATA: 10, // data information
        }
    }
}
