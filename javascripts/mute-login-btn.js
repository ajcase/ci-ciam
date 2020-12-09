let chosen_scenario = localStorage.getItem('scenario');
let environment = localStorage.getItem('environment');
chosen_scenario = JSON.parse(chosen_scenario);
const open_new_account_btn = document.getElementById("open-new-account-btn");
const inner_open_new_account_btn = document.getElementById("inner-open-btn");
const login_btn = document.getElementById("login-btn");
const inner_login_btn = document.getElementById("inner-login-btn");

function buttonRefresh(){
    if(environment == "Bank"){
        if(login_btn != null){
            login_btn.setAttribute("href","login.html");
        }
        if(inner_login_btn != null){
            inner_login_btn.setAttribute("href","login.html");
        }
        if(open_new_account_btn != null){
            open_new_account_btn.setAttribute("href","open-new-account.html");
        }
        if(inner_open_new_account_btn != null){
            inner_open_new_account_btn.setAttribute("href","open-new-account.html");
        }
    }
    if(environment == "Insurance" ){
        if(login_btn != null){
            login_btn.setAttribute("href","insurance-login.html");
        }
        if(inner_login_btn != null){
            inner_login_btn.setAttribute("href","insurance-login.html");
        }
        if(open_new_account_btn != null){
            open_new_account_btn.setAttribute("href","insurance-open-new-account.html");
        }
        if(inner_open_new_account_btn != null){
            inner_open_new_account_btn.setAttribute("href","insurance-open-new-account.html");
        }
    }
    if(environment == "Airline"){
        if(login_btn != null){
            login_btn.setAttribute("href","airline-index.html");
        }
        if(inner_login_btn != null){
            inner_login_btn.setAttribute("href","airline-index.html");
        }
        if(open_new_account_btn != null){
            open_new_account_btn.setAttribute("href","airline-new-account.html");
        }
        if(inner_open_new_account_btn != null){
            inner_open_new_account_btn.setAttribute("href","airline-new-account.html");
        }
    }
    
}

function buttonMute(){
    if(chosen_scenario["Flow"]["Disable Login"] == true){
        if(login_btn != null){
            if(environment=="Airline"){
                login_btn.setAttribute("onclick","");
            }
            else{
                login_btn.setAttribute("href","#");
            }
        }
        if(inner_login_btn != null){
            inner_login_btn.setAttribute("href","#");;
        }
    }

    if(chosen_scenario["Flow"]["Disable New Account"] == true){
        if(open_new_account_btn != null){
            if(environment=="Airline"){
                open_new_account_btn.setAttribute("onclick","");
            }
            else{
                open_new_account_btn.setAttribute("href","#");
            }
        }
        if(inner_open_new_account_btn != null){
            inner_open_new_account_btn.setAttribute("href","#");
        }
    }
}

function buttonOverlayRedirect(){
    if(chosen_scenario["General Details"]["Name"] === "Cross Channel Fraud - Mobile"){
        if(login_btn != null){
            login_btn.setAttribute("href","overlay-login.html");
        }
        if(inner_login_btn != null){
            inner_login_btn.setAttribute("href","overlay-login.html");
        }
    }
}

buttonRefresh();
buttonMute();
buttonOverlayRedirect();
