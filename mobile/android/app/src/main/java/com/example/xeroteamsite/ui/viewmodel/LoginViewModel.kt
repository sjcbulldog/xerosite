package com.example.xeroteamsite.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.xeroteamsite.data.model.LoginResponse
import com.example.xeroteamsite.data.repository.XerositeRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class LoginState {
    object Idle : LoginState()
    object Loading : LoginState()
    data class Success(val response: LoginResponse) : LoginState()
    data class Error(val message: String) : LoginState()
}

class LoginViewModel(private val repository: XerositeRepository) : ViewModel() {

    private val _loginState = MutableStateFlow<LoginState>(LoginState.Idle)
    val loginState: StateFlow<LoginState> = _loginState.asStateFlow()

    fun login(email: String, password: String) {
        viewModelScope.launch {
            _loginState.value = LoginState.Loading
            repository.login(email, password).fold(
                onSuccess = { response ->
                    _loginState.value = LoginState.Success(response)
                },
                onFailure = { exception ->
                    _loginState.value = LoginState.Error(exception.message ?: "Login failed")
                }
            )
        }
    }

    fun resetState() {
        _loginState.value = LoginState.Idle
    }
}

