var fs = require('fs');

module.exports = {
    stat : function(path){
        return new Promise(function(resolve, reject){
            fs.stat(path, function(err, stats){
                if(err){
                    reject(err);
                } else{
                    resolve(stats);
                }
            })
        });
    }
};
