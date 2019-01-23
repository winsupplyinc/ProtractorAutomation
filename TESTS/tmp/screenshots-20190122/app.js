var app = angular.module('reportingApp', []);

//<editor-fold desc="global helpers">

var isValueAnArray = function (val) {
    return Array.isArray(val);
};

var getSpec = function (str) {
    var describes = str.split('|');
    return describes[describes.length - 1];
};
var checkIfShouldDisplaySpecName = function (prevItem, item) {
    if (!prevItem) {
        item.displaySpecName = true;
    } else if (getSpec(item.description) !== getSpec(prevItem.description)) {
        item.displaySpecName = true;
    }
};

var getParent = function (str) {
    var arr = str.split('|');
    str = "";
    for (var i = arr.length - 2; i > 0; i--) {
        str += arr[i] + " > ";
    }
    return str.slice(0, -3);
};

var getShortDescription = function (str) {
    return str.split('|')[0];
};

var countLogMessages = function (item) {
    if ((!item.logWarnings || !item.logErrors) && item.browserLogs && item.browserLogs.length > 0) {
        item.logWarnings = 0;
        item.logErrors = 0;
        for (var logNumber = 0; logNumber < item.browserLogs.length; logNumber++) {
            var logEntry = item.browserLogs[logNumber];
            if (logEntry.level === 'SEVERE') {
                item.logErrors++;
            }
            if (logEntry.level === 'WARNING') {
                item.logWarnings++;
            }
        }
    }
};

var defaultSortFunction = function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) {
        return -1;
    }
    else if (a.sessionId > b.sessionId) {
        return 1;
    }

    if (a.timestamp < b.timestamp) {
        return -1;
    }
    else if (a.timestamp > b.timestamp) {
        return 1;
    }

    return 0;
};


//</editor-fold>

app.controller('ScreenshotReportController', function ($scope, $http) {
    var that = this;
    var clientDefaults = {};

    $scope.searchSettings = Object.assign({
        description: '',
        allselected: true,
        passed: true,
        failed: true,
        pending: true,
        withLog: true
    }, clientDefaults.searchSettings || {}); // enable customisation of search settings on first page hit

    var initialColumnSettings = clientDefaults.columnSettings; // enable customisation of visible columns on first page hit
    if (initialColumnSettings) {
        if (initialColumnSettings.displayTime !== undefined) {
            // initial settings have be inverted because the html bindings are inverted (e.g. !ctrl.displayTime)
            this.displayTime = !initialColumnSettings.displayTime;
        }
        if (initialColumnSettings.displayBrowser !== undefined) {
            this.displayBrowser = !initialColumnSettings.displayBrowser; // same as above
        }
        if (initialColumnSettings.displaySessionId !== undefined) {
            this.displaySessionId = !initialColumnSettings.displaySessionId; // same as above
        }
        if (initialColumnSettings.displayOS !== undefined) {
            this.displayOS = !initialColumnSettings.displayOS; // same as above
        }
        if (initialColumnSettings.inlineScreenshots !== undefined) {
            this.inlineScreenshots = initialColumnSettings.inlineScreenshots; // this setting does not have to be inverted
        } else {
            this.inlineScreenshots = false;
        }
    }

    this.showSmartStackTraceHighlight = true;

    this.chooseAllTypes = function () {
        var value = true;
        $scope.searchSettings.allselected = !$scope.searchSettings.allselected;
        if (!$scope.searchSettings.allselected) {
            value = false;
        }

        $scope.searchSettings.passed = value;
        $scope.searchSettings.failed = value;
        $scope.searchSettings.pending = value;
        $scope.searchSettings.withLog = value;
    };

    this.isValueAnArray = function (val) {
        return isValueAnArray(val);
    };

    this.getParent = function (str) {
        return getParent(str);
    };

    this.getSpec = function (str) {
        return getSpec(str);
    };

    this.getShortDescription = function (str) {
        return getShortDescription(str);
    };

    this.convertTimestamp = function (timestamp) {
        var d = new Date(timestamp),
            yyyy = d.getFullYear(),
            mm = ('0' + (d.getMonth() + 1)).slice(-2),
            dd = ('0' + d.getDate()).slice(-2),
            hh = d.getHours(),
            h = hh,
            min = ('0' + d.getMinutes()).slice(-2),
            ampm = 'AM',
            time;

        if (hh > 12) {
            h = hh - 12;
            ampm = 'PM';
        } else if (hh === 12) {
            h = 12;
            ampm = 'PM';
        } else if (hh === 0) {
            h = 12;
        }

        // ie: 2013-02-18, 8:35 AM
        time = yyyy + '-' + mm + '-' + dd + ', ' + h + ':' + min + ' ' + ampm;

        return time;
    };


    this.round = function (number, roundVal) {
        return (parseFloat(number) / 1000).toFixed(roundVal);
    };


    this.passCount = function () {
        var passCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.passed) {
                passCount++;
            }
        }
        return passCount;
    };


    this.pendingCount = function () {
        var pendingCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.pending) {
                pendingCount++;
            }
        }
        return pendingCount;
    };


    this.failCount = function () {
        var failCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (!result.passed && !result.pending) {
                failCount++;
            }
        }
        return failCount;
    };

    this.passPerc = function () {
        return (this.passCount() / this.totalCount()) * 100;
    };
    this.pendingPerc = function () {
        return (this.pendingCount() / this.totalCount()) * 100;
    };
    this.failPerc = function () {
        return (this.failCount() / this.totalCount()) * 100;
    };
    this.totalCount = function () {
        return this.passCount() + this.failCount() + this.pendingCount();
    };

    this.applySmartHighlight = function (line) {
        if (this.showSmartStackTraceHighlight) {
            if (line.indexOf('node_modules') > -1) {
                return 'greyout';
            }
            if (line.indexOf('  at ') === -1) {
                return '';
            }

            return 'highlight';
        }
        return true;
    };

    var results = [
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190122",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 1848,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548192955768,
                "type": ""
            }
        ],
        "screenShotFile": "00ca0014-00d7-009a-00c3-00fa002e00dd.png",
        "timestamp": 1548192953264,
        "duration": 36987
    },
    {
        "description": "Delete Driver|Shipping Manifest Create/Delete Driver-20190122",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 1848,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:16595)\n    at debugCheckRenderNodeFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15690)\n    at Object.eval [as updateRenderer] (ng:///DriverModule/DriverNewComponent.ngfactory.js:1189:5)\n    at Object.debugUpdateRenderer [as updateRenderer] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15960)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:4841)",
                "timestamp": 1548192992310,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548192992311,
                "type": ""
            }
        ],
        "screenShotFile": "000b0065-002a-00e1-00cc-00ac00ca0082.png",
        "timestamp": 1548192990980,
        "duration": 4973
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190122-16-37-22",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 32,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548193053384,
                "type": ""
            }
        ],
        "screenShotFile": "00af002e-0061-00e8-00b1-00ee0057006c.png",
        "timestamp": 1548193050939,
        "duration": 37001
    },
    {
        "description": "Delete Driver|Shipping Manifest Create/Delete Driver-20190122-16-37-22",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 32,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:16595)\n    at debugCheckRenderNodeFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15690)\n    at Object.eval [as updateRenderer] (ng:///DriverModule/DriverNewComponent.ngfactory.js:1189:5)\n    at Object.debugUpdateRenderer [as updateRenderer] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15960)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:4841)",
                "timestamp": 1548193089989,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548193089991,
                "type": ""
            }
        ],
        "screenShotFile": "00b50072-002c-0009-00a6-003a006e0020.png",
        "timestamp": 1548193088675,
        "duration": 4932
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190122-16-42-35",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 17828,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548193366732,
                "type": ""
            }
        ],
        "screenShotFile": "00b00007-0088-0031-00a0-0085006700eb.png",
        "timestamp": 1548193364325,
        "duration": 36847
    },
    {
        "description": "Delete Driver|Shipping Manifest Create/Delete Driver-20190122-16-42-35",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 17828,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:16595)\n    at debugCheckRenderNodeFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15690)\n    at Object.eval [as updateRenderer] (ng:///DriverModule/DriverNewComponent.ngfactory.js:1189:5)\n    at Object.debugUpdateRenderer [as updateRenderer] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15960)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:4841)",
                "timestamp": 1548193403220,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548193403222,
                "type": ""
            }
        ],
        "screenShotFile": "004900e4-001e-00e9-00fc-003f00190084.png",
        "timestamp": 1548193401896,
        "duration": 4931
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190122-16-46-41",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 16644,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548193612296,
                "type": ""
            }
        ],
        "screenShotFile": "006000cd-0025-0032-0071-0008006a00db.png",
        "timestamp": 1548193609577,
        "duration": 37364
    },
    {
        "description": "Delete Driver|Shipping Manifest Create/Delete Driver-20190122-16-46-41",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 16644,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:16595)\n    at debugCheckRenderNodeFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15690)\n    at Object.eval [as updateRenderer] (ng:///DriverModule/DriverNewComponent.ngfactory.js:1189:5)\n    at Object.debugUpdateRenderer [as updateRenderer] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15960)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:4841)",
                "timestamp": 1548193649015,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548193649017,
                "type": ""
            }
        ],
        "screenShotFile": "003b00e1-00bf-008c-0042-0047006c0000.png",
        "timestamp": 1548193647687,
        "duration": 4933
    }
];

    this.sortSpecs = function () {
        this.results = results.sort(function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) return -1;else if (a.sessionId > b.sessionId) return 1;

    if (a.timestamp < b.timestamp) return -1;else if (a.timestamp > b.timestamp) return 1;

    return 0;
});
    };

    this.loadResultsViaAjax = function () {

        $http({
            url: './combined.json',
            method: 'GET'
        }).then(function (response) {
                var data = null;
                if (response && response.data) {
                    if (typeof response.data === 'object') {
                        data = response.data;
                    } else if (response.data[0] === '"') { //detect super escaped file (from circular json)
                        data = CircularJSON.parse(response.data); //the file is escaped in a weird way (with circular json)
                    }
                    else
                    {
                        data = JSON.parse(response.data);
                    }
                }
                if (data) {
                    results = data;
                    that.sortSpecs();
                }
            },
            function (error) {
                console.error(error);
            });
    };


    if (clientDefaults.useAjax) {
        this.loadResultsViaAjax();
    } else {
        this.sortSpecs();
    }


});

app.filter('bySearchSettings', function () {
    return function (items, searchSettings) {
        var filtered = [];
        if (!items) {
            return filtered; // to avoid crashing in where results might be empty
        }
        var prevItem = null;

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            item.displaySpecName = false;

            var isHit = false; //is set to true if any of the search criteria matched
            countLogMessages(item); // modifies item contents

            var hasLog = searchSettings.withLog && item.browserLogs && item.browserLogs.length > 0;
            if (searchSettings.description === '' ||
                (item.description && item.description.toLowerCase().indexOf(searchSettings.description.toLowerCase()) > -1)) {

                if (searchSettings.passed && item.passed || hasLog) {
                    isHit = true;
                } else if (searchSettings.failed && !item.passed && !item.pending || hasLog) {
                    isHit = true;
                } else if (searchSettings.pending && item.pending || hasLog) {
                    isHit = true;
                }
            }
            if (isHit) {
                checkIfShouldDisplaySpecName(prevItem, item);

                filtered.push(item);
                prevItem = item;
            }
        }

        return filtered;
    };
});

