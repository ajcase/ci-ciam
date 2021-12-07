var axios = require("axios");

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

  async performDUA(token, r, callback) {
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
      data: r,
    };
    console.log("DUA DPCM Body:", options);

    var response = await axios(options);
	  console.log("DUA response:", JSON.stringify(response.data));
    var jsonBody = response.data;
    callback(null, response.data);
  }

  async getDSP(token, r, callback) {
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
      data: r,
    };
    console.log("DSP DPCM Body:", options);

    var response = await axios(options);
    var jsonBody = response.data;
    console.log("Got information on consent decision:", JSON.stringify(jsonBody));
    callback(null, jsonBody);
  }

  async storeConsents(token, consents, callback) {
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
      data: ops,
    };
    console.log(`Storing consents:`, options);

    var response = await axios(options);
	  console.log("Consent accepted by Verify");
	  console.log('statusCode:', response && response.status);
	  console.log('body:', JSON.stringify(response.data));
    callback(null, true);
  }

  async getUserConsents(token, callback) {
	var options = {
	  method: 'GET',
	  url: this.config.tenantUrl + '/dpcm-mgmt/config/v1.0/privacy/consents',
	  headers: {
		'Content-Type': 'application/json',
		'Authorization': `Bearer ${token}`
	  }
	};
	var response = await axios(options);
  callback(null, response.data);
  }
}

module.exports = DPCMClient;
