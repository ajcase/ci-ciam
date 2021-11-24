var request = require("request");

class DPCMClient {
  constructor(config) {
    if (!config) {
      throw new Error("Config parameter is required");
    }
    if (!config.tenantUrl || config.tenantUrl == "") {
      throw new Error(
        "A valid tenantUrl property is required in config settings"
      );
    }

    this.config = config;
  }

  performDUA(token, r, callback) {
    if (!r) {
      throw new Error("DUA: No request object provided");
    }
    if (!r.items) {
      throw new Error("DUA: No request items provided");
	}
	console.log('[DPCM] r = ' + JSON.stringify(r));
    var options = {
      method: "POST",
      url: this.config.tenantUrl + "/dpcm/v1.0/privacy/data-usage-approval",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(r),
    };
    console.log("DUA DPCM Body:", options);

    request(options, function (error, response, body) {
	  console.log("DUA response:", body);
      if (error) throw new Error(error);
      var jsonBody = JSON.parse(body);
      callback(null, jsonBody);
    });
  }

  getDSP(token, r, callback) {
    if (!r) {
      throw new Error("DSP: No request object provided");
    }
    if (!r.purposeId) {
      throw new Error("DSP: No request purpose IDs provided");
    }
    var options = {
      method: "POST",
      url:
        this.config.tenantUrl + "/dpcm/v1.0/privacy/data-subject-presentation",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(r),
    };
    console.log("DSP DPCM Body:", options);

    request(options, function (error, response, body) {
      var jsonBody = JSON.parse(body);
      console.log("Got information on consent decision:", jsonBody);
      if (error) throw new Error(error);
      callback(null, jsonBody);
    });
  }

  storeConsents(token, consents, callback) {
    var ops = [];
    consents.forEach(function (consent, index) {
      ops.push({
        op: "add",
        value: consent,
      });
    });

    var options = {
      method: "PATCH",
      url: this.config.tenantUrl + "/dpcm/v1.0/privacy/consents",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(ops),
    };
    console.log(`Storing consents:`, options);

    request(options, function (error, response, body) {
	  console.log("Consent accepted by Verify");
	  console.log('statusCode:', response && response.statusCode);
  	  console.log('body:', body);
      if (error) throw new Error(error);
      callback(null, true);
    });
  }

  getUserConsents(token, callback) {
	var options = {
	  method: 'GET',
	  url: this.config.tenantUrl + '/dpcm-mgmt/config/v1.0/privacy/consents',
	  headers: {
		'Content-Type': 'application/json',
		'Authorization': `Bearer ${token}`
	  }
	};
	request(options, function(error, response, body) {
		if (error) throw new Error(error);
		callback(null, JSON.parse(body));
	});
  }
}

module.exports = DPCMClient;
